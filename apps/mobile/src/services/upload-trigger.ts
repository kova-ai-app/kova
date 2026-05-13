import { runUploadManager } from './upload-manager'

type GetToken = () => Promise<string | null>

let inFlightUpload: Promise<void> | null = null

export function triggerUpload(getToken: GetToken): Promise<void> {
  if (inFlightUpload) {
    return inFlightUpload
  }

  inFlightUpload = (async () => {
    const token = await getToken()
    if (!token) return

    await runUploadManager({
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://kova.vercel.app',
      authToken: token,
    })
  })().finally(() => {
    inFlightUpload = null
  })

  return inFlightUpload
}
