import type { Plugin } from "@opencode-ai/plugin"
import { basename } from "path"
import { loadConfig, isEventNotificationEnabled, getMessage } from "./config"
import type { EventType, NotifierConfig } from "./config"
import { sendNotification } from "./notify"

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

    await Promise.allSettled(promises)
}

export const NotifierPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
    const config = loadConfig()
    const projectName = directory ? basename(directory) : null

    return {
        event: async ({ event }) => {
            if (event.type === "permission.updated") {
                await handleEvent(config, "permission", projectName)
            }

            if ((event as any).type === "permission.asked") {
                await handleEvent(config, "permission", projectName)
            }

            if (event.type === "session.idle") {
                await handleEvent(config, "complete", projectName)
            }

            if (event.type === "session.error") {
                await handleEvent(config, "error", projectName)
            }
        },
        "permission.ask": async () => {
            await handleEvent(config, "permission", projectName)
        },
        "tool.execute.before": async (input, output) => {
            if (input.tool === "question") {
                await handleEvent(config, "question", projectName)
            }
        },
    }
}

export default NotifierPlugin
