// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { ThumbUpload } from "../thumb-upload";

function makeFile(name: string, type: string, sizeBytes: number) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

describe("ThumbUpload", () => {
  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("renders the current thumbnail and the Change Thumbnail button", () => {
    render(<ThumbUpload videoId="abc" />);
    expect(screen.getByRole("button", { name: "Change Thumbnail" })).toBeInTheDocument();
  });

  it("previews and reports a valid image file via onFileChange", async () => {
    const user = userEvent.setup();
    const onFileChange = vi.fn();
    render(<ThumbUpload videoId="abc" onFileChange={onFileChange} />);
    const file = makeFile("new.png", "image/png", 1024 * 1024);
    const input = screen.getByLabelText("Choose thumbnail file");
    await user.upload(input, file);
    expect(onFileChange).toHaveBeenCalledWith(file);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it("shows an inline error and does not report a non-image file", async () => {
    // applyAccept: false — the input's accept="image/*" restricts the native file
    // picker, but our JS-level validation (and its error message) must still hold
    // for files that reach the change handler by any other means (e.g. drag-drop).
    const user = userEvent.setup({ applyAccept: false });
    const onFileChange = vi.fn();
    render(<ThumbUpload videoId="abc" onFileChange={onFileChange} />);
    const file = makeFile("notes.txt", "text/plain", 100);
    const input = screen.getByLabelText("Choose thumbnail file");
    await user.upload(input, file);
    expect(screen.getByRole("alert")).toHaveTextContent("Only image files are accepted");
    expect(onFileChange).not.toHaveBeenCalledWith(file);
  });

  it("shows an inline error for an image larger than 5MB", async () => {
    const user = userEvent.setup();
    render(<ThumbUpload videoId="abc" />);
    const file = makeFile("big.png", "image/png", 6 * 1024 * 1024);
    const input = screen.getByLabelText("Choose thumbnail file");
    await user.upload(input, file);
    expect(screen.getByRole("alert")).toHaveTextContent("5MB limit");
  });
});
