import { authedUpstream } from "@/lib/api/authed-upstream"
import { Card } from "@/components/ui/card"
import { ChannelSummary } from "@/components/studio/channel-summary"
import { ChannelSettingsFormContainer } from "@/components/studio/channel-settings-form-container"

export default async function ChannelSettingsPage() {
  const { data, error, response } = await authedUpstream().GET("/channels/me", {})

  if (error) {
    const message = Array.isArray(error.message) ? error.message.join(", ") : error.message
    throw new Error(message ?? `Failed to load channel (${response.status})`)
  }

  const channel = data

  return (
    <div className="flex w-full flex-col gap-6 px-6 pb-6 pt-8">
      <h1 className="text-h1 text-foreground">Channel Settings</h1>

      <ChannelSummary name={channel.name ?? ""} handle={`@${channel.nickname ?? ""}`} />

      <Card className="w-full gap-6 p-8">
        <ChannelSettingsFormContainer
          channel={{
            id: channel.id ?? "",
            nickname: channel.nickname ?? "",
            name: channel.name ?? "",
            description: channel.description ?? null,
            updatedAt: channel.updatedAt ?? "",
          }}
        />
      </Card>
    </div>
  )
}
