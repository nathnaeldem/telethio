export type APIResponse<T> = {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
  parameters?: {
    retry_after?: number
    migrate_to_chat_id?: number
  }
}

export type User = {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export type Chat = {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export type Message = {
  message_id: number
  from?: User
  chat: Chat
  date: number
  text?: string
}

export type Update = {
  update_id: number
  message?: Message
  edited_message?: Message
  channel_post?: Message
  edited_channel_post?: Message
  inline_query?: any
  chosen_inline_result?: any
  callback_query?: any
  shipping_query?: any
  pre_checkout_query?: any
  poll?: any
  poll_answer?: any
  my_chat_member?: any
  chat_member?: any
  chat_join_request?: any
}

export type SendMessageParams = {
  chat_id: number | string
  text: string
  parse_mode?: string
  disable_web_page_preview?: boolean
  disable_notification?: boolean
  protect_content?: boolean
  reply_to_message_id?: number
  allow_sending_without_reply?: boolean
  reply_markup?: Record<string, any>
}

export type GetUpdatesParams = {
  offset?: number
  limit?: number
  timeout?: number
  allowed_updates?: string[]
}

export type SetWebhookParams = {
  url: string
  secret_token?: string
  drop_pending_updates?: boolean
  allowed_updates?: string[]
  ip_address?: string
  max_connections?: number
}
