import { Plugin } from "@opencode/plugin"
import { basename } from "path"
import { loadConfig, isEventNotificationEnabled, getMessage, isEventSoundEnabled, getSound } from "./config"
import type { EventType, NotifierConfig } from "./config"
import { sendNotification } from "./notify"
import { playSound } from "./sound"

function getNotificationTitle(config: NotifierConfig, projectName: string | null): string {
    if (config.showProjectName && projectName) {
        return `OpenCode (${projectName})`
    }
    return "OpenCode"
}

async function handleEvent(
    config: NotifierConfig,
    eventType: EventType,
    projectName: string | null
): Promise<void> {
    const promises: Promise<void>[] = []

    if (isEventNotificationEnabled(config, eventType)) {
        const title = getNotificationTitle(config, projectName)
        const message = getMessage(config, eventType)
        promises.push(sendNotification(title, message, config.timeout))
    }

    if (isEventSoundEnabled(config, eventType)) {
        const customSound = getSound(config, eventType)
        promises.push(playSound(eventType, customSound))
    }

    await Promise.allSettled(promises)
}

export const NotifierPlugin = Plugin.define({
    id: "opencode-notifier",
    async setup(ctx) {
        const config = loadConfig()
        const directory = ctx.location.directory
        const projectName = directory ? basename(directory) : null

        const notify = (eventType: EventType) => handleEvent(config, eventType, projectName)

        const controller = new AbortController()
        void (async () => {
            for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
                switch (event.type) {
                    case "permission.asked":
                        await notify("permission")
                        break
                    case "session.idle":
                        await notify("complete")
                        break
                    case "session.execution.failed":
                        await notify("error")
                        break
                }
            }
        })()

        void ctx.tool.hook("execute.before", async (input) => {
            if (input.tool === "question") {
                await notify("question")
            }
        })

        return () => controller.abort()
    },
})

export default NotifierPlugin
