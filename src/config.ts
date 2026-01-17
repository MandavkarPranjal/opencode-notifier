import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"

export type EventType = "permission" | "complete" | "error" | "question"

export interface EventConfig {
    notification: boolean
}

export interface NotifierConfig {
    notification: boolean
    timeout: number
    showProjectName: boolean
    events: {
        permission: EventConfig
        complete: EventConfig
        error: EventConfig
        question: EventConfig
    }
    messages: {
        permission: string
        complete: string
        error: string
        question: string
    }
}

const DEFAULT_EVENT_CONFIG: EventConfig = {
    notification: true,
}

const DEFAULT_CONFIG: NotifierConfig = {
    notification: true,
    timeout: 5,
    showProjectName: true,
    events: {
        permission: { ...DEFAULT_EVENT_CONFIG },
        complete: { ...DEFAULT_EVENT_CONFIG },
        error: { ...DEFAULT_EVENT_CONFIG },
        question: { ...DEFAULT_EVENT_CONFIG },
    },
    messages: {
        permission: "Session needs permission",
        complete: "Session has finished",
        error: "Session encountered an error",
        question: "Session has a question",
    },
}

function getConfigPath(): string {
    return join(homedir(), ".config", "opencode", "opencode-notifier.json")
}

function parseEventConfig(
    userEvent: boolean | { notification?: boolean } | undefined,
    defaultConfig: EventConfig
): EventConfig {
    if (userEvent === undefined) {
        return defaultConfig
    }

    if (typeof userEvent === "boolean") {
        return {
            notification: userEvent,
        }
    }

    return {
        notification: userEvent.notification ?? defaultConfig.notification,
    }
}

export function loadConfig(): NotifierConfig {
    const configPath = getConfigPath()

    if (!existsSync(configPath)) {
        return DEFAULT_CONFIG
    }

    try {
        const fileContent = readFileSync(configPath, "utf-8")
        const userConfig = JSON.parse(fileContent)

        const globalNotification = userConfig.notification ?? DEFAULT_CONFIG.notification

        const defaultWithGlobal: EventConfig = {
            notification: globalNotification,
        }

        return {
            notification: globalNotification,
            timeout:
                typeof userConfig.timeout === "number" && userConfig.timeout > 0
                    ? userConfig.timeout
                    : DEFAULT_CONFIG.timeout,
            showProjectName: userConfig.showProjectName ?? DEFAULT_CONFIG.showProjectName,
            events: {
                permission: parseEventConfig(userConfig.events?.permission ?? userConfig.permission, defaultWithGlobal),
                complete: parseEventConfig(userConfig.events?.complete ?? userConfig.complete, defaultWithGlobal),
                error: parseEventConfig(userConfig.events?.error ?? userConfig.error, defaultWithGlobal),
                question: parseEventConfig(userConfig.events?.question ?? userConfig.question, defaultWithGlobal),
            },
            messages: {
                permission: userConfig.messages?.permission ?? DEFAULT_CONFIG.messages.permission,
                complete: userConfig.messages?.complete ?? DEFAULT_CONFIG.messages.complete,
                error: userConfig.messages?.error ?? DEFAULT_CONFIG.messages.error,
                question: userConfig.messages?.question ?? DEFAULT_CONFIG.messages.question,
            },
        }
    } catch {
        return DEFAULT_CONFIG
    }
}

export function isEventNotificationEnabled(config: NotifierConfig, event: EventType): boolean {
    return config.events[event].notification
}

export function getMessage(config: NotifierConfig, event: EventType): string {
    return config.messages[event]
}
