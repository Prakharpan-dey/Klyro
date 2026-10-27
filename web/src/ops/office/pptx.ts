import { escapeXml, XML_HEADER, zipParts } from './ooxml'

/**
 * A PowerPoint writer: picture slides with speaker notes.
 *
 * A .pptx is a zip of XML parts tied together by relationship files, the same
 * construction as the .docx and .xlsx writers beside this one. PowerPoint is
 * far less forgiving than Word about it, though. A relationship pointing at a
 * part that is not there, a part with no content type, or elements in the
 * wrong order inside presentation.xml, and it opens with "PowerPoint found a
 * problem with content" and offers to repair the file. So this writes the
 * smallest complete set of parts PowerPoint expects, in schema order, and the
 * tests check every relationship resolves.
 *
 * Slides hold one picture each. Text goes in the speaker notes, where it can
 * be searched and copied, rather than being rebuilt as text boxes that would
 * drift away from the page they came from.
 */

export interface Slide {
  image: Uint8Array
  kind: 'png' | 'jpg'
  /** pixel size of the image, used to keep its proportions on the slide */
  width: number
  height: number
  /** speaker notes; blank lines become separate paragraphs */
  notes?: string
  /** alt text for the picture, read out by screen readers in PowerPoint */
  alt?: string
}

/** Slide size in EMU (914 400 to the inch). */
export interface SlideSize {
  cx: number
  cy: number
}

export const EMU_PER_INCH = 914400
export const EMU_PER_PT = 12700

export const SLIDE_16_9: SlideSize = { cx: 12192000, cy: 6858000 }
export const SLIDE_4_3: SlideSize = { cx: 9144000, cy: 6858000 }

/** PowerPoint refuses slide sides outside 1 inch to 56 inches. */
const MIN_SIDE = 914400
const MAX_SIDE = 51206400

/**
 * A slide shaped like a page, scaled so its long side matches a standard
 * widescreen slide. A4 pages become a portrait deck rather than a 16:9 one
 * with a narrow strip of page in the middle.
 */
export function slideSizeFor(width: number, height: number): SlideSize {
  if (!(width > 0 && height > 0)) return SLIDE_16_9
  const long = SLIDE_16_9.cx
  const scale = long / Math.max(width, height)
  const clamp = (n: number) => Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(n)))
  return { cx: clamp(width * scale), cy: clamp(height * scale) }
}

/** The largest box with the image's proportions that fits the slide, centred. */
export function fitPicture(
  image: { width: number; height: number },
  slide: SlideSize,
): { x: number; y: number; cx: number; cy: number } {
  const scale = Math.min(slide.cx / image.width, slide.cy / image.height)
  const cx = Math.round(image.width * scale)
  const cy = Math.round(image.height * scale)
  return { x: Math.round((slide.cx - cx) / 2), y: Math.round((slide.cy - cy) / 2), cx, cy }
}

/* ── namespaces and content types ─────────────────────────────── */

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NAMESPACES = `xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"`

const CT = 'application/vnd.openxmlformats-officedocument.presentationml'
const TYPES = {
  presentation: `${CT}.presentation.main+xml`,
  slide: `${CT}.slide+xml`,
  layout: `${CT}.slideLayout+xml`,
  master: `${CT}.slideMaster+xml`,
  notesMaster: `${CT}.notesMaster+xml`,
  notesSlide: `${CT}.notesSlide+xml`,
  presProps: `${CT}.presProps+xml`,
  viewProps: `${CT}.viewProps+xml`,
  tableStyles: `${CT}.tableStyles+xml`,
  theme: 'application/vnd.openxmlformats-officedocument.theme+xml',
}

export const PPTX_MIME = `${CT}.presentation`

function relationships(rels: { id: string; type: string; target: string }[]): string {
  return `${XML_HEADER}<Relationships xmlns="${NS_REL}">${rels
    .map((r) => `<Relationship Id="${r.id}" Type="${REL}/${r.type}" Target="${r.target}"/>`)
    .join('')}</Relationships>`
}

/* ── fixed parts ──────────────────────────────────────────────── */

const GROUP_PROPS =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'

const CLR_MAP =
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'

function theme(name: string): string {
  const solid = (c: string) => `<a:solidFill><a:schemeClr val="${c}"/></a:solidFill>`
  const line = (w: number) =>
    `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr">${solid('phClr')}<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`
  const fonts = (face: string) =>
    `<a:latin typeface="${face}"/><a:ea typeface=""/><a:cs typeface=""/>`

  return `${XML_HEADER}<a:theme xmlns:a="${NS_A}" name="${name}"><a:themeElements>
<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>
<a:fontScheme name="Office"><a:majorFont>${fonts('Calibri Light')}</a:majorFont><a:minorFont>${fonts('Calibri')}</a:minorFont></a:fontScheme>
<a:fmtScheme name="Office"><a:fillStyleLst>${solid('phClr')}${solid('phClr')}${solid('phClr')}</a:fillStyleLst><a:lnStyleLst>${line(6350)}${line(12700)}${line(19050)}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${solid('phClr')}${solid('phClr')}${solid('phClr')}</a:bgFillStyleLst></a:fmtScheme>
</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`
}

const SLIDE_MASTER = `${XML_HEADER}<p:sldMaster ${NAMESPACES}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${GROUP_PROPS}</p:spTree></p:cSld>${CLR_MAP}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`

const SLIDE_LAYOUT = `${XML_HEADER}<p:sldLayout ${NAMESPACES} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${GROUP_PROPS}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`

/** Notes pages are portrait letter: picture of the slide on top, notes below. */
const NOTES_SIZE = { cx: 6858000, cy: 9144000 }
const NOTES_IMAGE = { x: 685800, y: 685800, cx: 5486400, cy: 3429000 }
const NOTES_BODY = { x: 685800, y: 4343400, cx: 5486400, cy: 4114800 }

const xfrm = (b: { x: number; y: number; cx: number; cy: number }) =>
  `<a:xfrm><a:off x="${b.x}" y="${b.y}"/><a:ext cx="${b.cx}" cy="${b.cy}"/></a:xfrm>`

function notesPlaceholders(text?: string): string {
  const image =
    `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr>${xfrm(NOTES_IMAGE)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:sp>`

  const paragraphs =
    text === undefined
      ? '<a:p><a:endParaRPr lang="en-US"/></a:p>'
      : notesParagraphs(text)

  const body =
    `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>` +
    `<p:spPr>${xfrm(NOTES_BODY)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`

  return image + body
}

/** One paragraph per line of notes; an empty notes field still needs one. */
export function notesParagraphs(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, i, all) => line !== '' || (all[i - 1] ?? '') !== '')

  if (!lines.length || lines.every((line) => !line)) {
    return '<a:p><a:endParaRPr lang="en-US"/></a:p>'
  }
  return lines
    .map((line) =>
      line
        ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapeXml(line)}</a:t></a:r></a:p>`
        : '<a:p><a:endParaRPr lang="en-US"/></a:p>',
    )
    .join('')
}

const NOTES_MASTER = `${XML_HEADER}<p:notesMaster ${NAMESPACES}><p:cSld><p:spTree>${GROUP_PROPS}${notesPlaceholders()}</p:spTree></p:cSld>${CLR_MAP}</p:notesMaster>`

/* ── per-slide parts ──────────────────────────────────────────── */

function slideXml(slide: Slide, index: number, size: SlideSize): string {
  const box = fitPicture(slide, size)
  const alt = escapeXml(slide.alt ?? `Slide ${index + 1}`)
  return (
    `${XML_HEADER}<p:sld ${NAMESPACES}><p:cSld><p:spTree>${GROUP_PROPS}` +
    `<p:pic><p:nvPicPr><p:cNvPr id="2" name="Picture ${index + 1}" descr="${alt}"/>` +
    `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr>${xfrm(box)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>` +
    `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
  )
}

function notesSlideXml(text: string): string {
  return `${XML_HEADER}<p:notes ${NAMESPACES}><p:cSld><p:spTree>${GROUP_PROPS}${notesPlaceholders(text)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`
}

/* ── the package ──────────────────────────────────────────────── */

export function pptxParts(slides: Slide[], size: SlideSize): Record<string, string | Uint8Array> {
  if (!slides.length) throw new Error('A presentation needs at least one slide')

  const parts: Record<string, string | Uint8Array> = {}
  const overrides: [string, string][] = []
  const withNotes = slides.some((slide) => slide.notes !== undefined)

  // presentation.xml relationships: master first, then one per slide, then the rest
  const presRels: { id: string; type: string; target: string }[] = [
    { id: 'rId1', type: 'slideMaster', target: 'slideMasters/slideMaster1.xml' },
  ]
  const slideIds: string[] = []

  slides.forEach((slide, i) => {
    const n = i + 1
    const rId = `rId${n + 1}`
    const media = `image${n}.${slide.kind === 'jpg' ? 'jpeg' : 'png'}`

    presRels.push({ id: rId, type: 'slide', target: `slides/slide${n}.xml` })
    // slide ids start at 256, the lowest PowerPoint accepts
    slideIds.push(`<p:sldId id="${255 + n}" r:id="${rId}"/>`)

    parts[`ppt/media/${media}`] = slide.image
    parts[`ppt/slides/slide${n}.xml`] = slideXml(slide, i, size)
    overrides.push([`/ppt/slides/slide${n}.xml`, TYPES.slide])

    const slideRels = [
      { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
      { id: 'rId2', type: 'image', target: `../media/${media}` },
    ]
    if (slide.notes !== undefined) {
      slideRels.push({ id: 'rId3', type: 'notesSlide', target: `../notesSlides/notesSlide${n}.xml` })
      parts[`ppt/notesSlides/notesSlide${n}.xml`] = notesSlideXml(slide.notes)
      parts[`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`] = relationships([
        { id: 'rId1', type: 'notesMaster', target: '../notesMasters/notesMaster1.xml' },
        { id: 'rId2', type: 'slide', target: `../slides/slide${n}.xml` },
      ])
      overrides.push([`/ppt/notesSlides/notesSlide${n}.xml`, TYPES.notesSlide])
    }
    parts[`ppt/slides/_rels/slide${n}.xml.rels`] = relationships(slideRels)
  })

  let next = slides.length + 2
  const rel = (type: string, target: string) => {
    const id = `rId${next++}`
    presRels.push({ id, type, target })
    return id
  }
  const notesMasterId = withNotes ? rel('notesMaster', 'notesMasters/notesMaster1.xml') : null
  rel('presProps', 'presProps.xml')
  rel('viewProps', 'viewProps.xml')
  rel('theme', 'theme/theme1.xml')
  rel('tableStyles', 'tableStyles.xml')

  // element order here is fixed by the schema; PowerPoint checks it
  parts['ppt/presentation.xml'] =
    `${XML_HEADER}<p:presentation ${NAMESPACES} saveSubsetFonts="1">` +
    `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
    (notesMasterId
      ? `<p:notesMasterIdLst><p:notesMasterId r:id="${notesMasterId}"/></p:notesMasterIdLst>`
      : '') +
    `<p:sldIdLst>${slideIds.join('')}</p:sldIdLst>` +
    `<p:sldSz cx="${size.cx}" cy="${size.cy}"/>` +
    `<p:notesSz cx="${NOTES_SIZE.cx}" cy="${NOTES_SIZE.cy}"/>` +
    `</p:presentation>`
  parts['ppt/_rels/presentation.xml.rels'] = relationships(presRels)

  parts['ppt/slideMasters/slideMaster1.xml'] = SLIDE_MASTER
  parts['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = relationships([
    { id: 'rId1', type: 'slideLayout', target: '../slideLayouts/slideLayout1.xml' },
    { id: 'rId2', type: 'theme', target: '../theme/theme1.xml' },
  ])
  parts['ppt/slideLayouts/slideLayout1.xml'] = SLIDE_LAYOUT
  parts['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = relationships([
    { id: 'rId1', type: 'slideMaster', target: '../slideMasters/slideMaster1.xml' },
  ])
  parts['ppt/theme/theme1.xml'] = theme('Klyro')

  if (withNotes) {
    parts['ppt/notesMasters/notesMaster1.xml'] = NOTES_MASTER
    parts['ppt/notesMasters/_rels/notesMaster1.xml.rels'] = relationships([
      { id: 'rId1', type: 'theme', target: '../theme/theme2.xml' },
    ])
    parts['ppt/theme/theme2.xml'] = theme('Klyro Notes')
    overrides.push(['/ppt/notesMasters/notesMaster1.xml', TYPES.notesMaster])
    overrides.push(['/ppt/theme/theme2.xml', TYPES.theme])
  }

  parts['ppt/presProps.xml'] = `${XML_HEADER}<p:presentationPr ${NAMESPACES}/>`
  parts['ppt/viewProps.xml'] = `${XML_HEADER}<p:viewPr ${NAMESPACES}/>`
  parts['ppt/tableStyles.xml'] =
    `${XML_HEADER}<a:tblStyleLst xmlns:a="${NS_A}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`

  overrides.push(
    ['/ppt/presentation.xml', TYPES.presentation],
    ['/ppt/slideMasters/slideMaster1.xml', TYPES.master],
    ['/ppt/slideLayouts/slideLayout1.xml', TYPES.layout],
    ['/ppt/theme/theme1.xml', TYPES.theme],
    ['/ppt/presProps.xml', TYPES.presProps],
    ['/ppt/viewProps.xml', TYPES.viewProps],
    ['/ppt/tableStyles.xml', TYPES.tableStyles],
  )

  parts['[Content_Types].xml'] =
    `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="png" ContentType="image/png"/>` +
    `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
    overrides.map(([part, type]) => `<Override PartName="${part}" ContentType="${type}"/>`).join('') +
    `</Types>`

  parts['_rels/.rels'] = relationships([
    { id: 'rId1', type: 'officeDocument', target: 'ppt/presentation.xml' },
  ])

  return parts
}

export async function buildPptx(slides: Slide[], size: SlideSize): Promise<Uint8Array> {
  return zipParts(pptxParts(slides, size))
}
