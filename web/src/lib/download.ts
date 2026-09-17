export function saveFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // give the browser a moment to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let i = 2
  while (taken.has(`${base} (${i})${ext}`)) i++
  return `${base} (${i})${ext}`
}

export async function saveZip(files: File[], zipName: string) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const taken = new Set<string>()
  for (const f of files) {
    const name = uniqueName(f.name, taken)
    taken.add(name)
    zip.file(name, f)
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  saveFile(blob, zipName)
}
