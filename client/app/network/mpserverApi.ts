import { apiFetchUrl } from '../config/mpmapApiBase'
import type { MpserverDirectory } from '../types/messages'

/** Load the FG multiplayer server directory (SRV + TXT from the backend). */
export async function fetchMpserverDirectory(signal?: AbortSignal): Promise<MpserverDirectory> {
  const res = await fetch(apiFetchUrl('api/stat/'), { signal })
  if (!res.ok) throw new Error(`api/stat/ failed: ${res.status}`)
  return (await res.json()) as MpserverDirectory
}
