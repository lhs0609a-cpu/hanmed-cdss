import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from '@tiptap/extension-table'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Type,
  Palette,
} from 'lucide-react'

/**
 * 게시글 작성 에디터.
 *
 * 마크다운 텍스트영역을 대신한다. 원장이 "네이버 블로그처럼 폰트부터 색상,
 * 이미지 첨부까지" 라고 요구했다.
 *
 * 저장 형식이 마크다운에서 HTML 로 바뀐다. 글꼴·글자색·배경색·정렬은
 * 마크다운으로 표현할 수 없기 때문이다. 기존 마크다운 게시글은 그대로 두고
 * 읽는 쪽(PostContent)에서 둘을 구분해 그린다 — 28편을 변환하다 깨뜨리는 것보다
 * 읽는 쪽에서 나누는 편이 안전하다.
 *
 * TipTap 을 쓴 이유: 직접 만들면 contentEditable 의 브라우저별 차이(한글 IME
 * 조합 중 커서 튐, 붙여넣기 정규화)를 전부 떠안게 된다. 한글 입력이 깨지는
 * 에디터는 쓸 수 없다.
 */

/** 글꼴 — 한글이 실제로 예쁘게 나오는 것만 담았다. 없는 폰트를 목록에 넣으면
 *  고른 사람은 바뀐 줄 아는데 화면은 그대로다. */
const FONTS: Array<{ label: string; value: string }> = [
  { label: '기본', value: '' },
  { label: '프리텐다드', value: 'Pretendard, -apple-system, sans-serif' },
  { label: '노토산스', value: '"Noto Sans KR", sans-serif' },
  { label: '나눔고딕', value: '"Nanum Gothic", sans-serif' },
  { label: '나눔명조', value: '"Nanum Myeongjo", serif' },
  { label: '고정폭', value: '"D2Coding", Consolas, monospace' },
]

const SIZES: Array<{ label: string; level: 0 | 1 | 2 | 3 }> = [
  { label: '본문', level: 0 },
  { label: '대제목', level: 1 },
  { label: '중제목', level: 2 },
  { label: '소제목', level: 3 },
]

/** 글자색 — 의료 콘텐츠라 형광색은 넣지 않았다. 읽는 데 방해가 된다. */
const COLORS = [
  '#111827', '#374151', '#6B7280', '#9CA3AF',
  '#B91C1C', '#DC2626', '#EA580C', '#CA8A04',
  '#15803D', '#0D9488', '#1D4ED8', '#4F46E5',
  '#7C3AED', '#BE185D',
]

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // 선택 영역이 풀리지 않게
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-30 ${
        active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-neutral-200" />
}

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  /** 이미지 파일을 받아 URL 을 돌려준다. 없으면 이미지 버튼이 URL 입력으로 동작한다. */
  onUploadImage?: (file: File) => Promise<string>
  placeholder?: string
}

export function RichEditor({
  value,
  onChange,
  onUploadImage,
  placeholder,
}: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showColors, setShowColors] = useState(false)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // 링크는 아래에서 따로 설정한다(새 창 열기 때문).
        link: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ImageExt.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder ?? '내용을 입력하세요',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // 바깥에서 값이 바뀐 경우(임시저장 불러오기 등)만 반영한다.
  // 매 입력마다 setContent 를 부르면 한글 조합 중에 커서가 튄다.
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!editor) return
      if (!onUploadImage) return
      setUploading(true)
      try {
        const url = await onUploadImage(file)
        editor.chain().focus().setImage({ src: url }).run()
      } finally {
        setUploading(false)
      }
    },
    [editor, onUploadImage],
  )

  // 붙여넣기·드래그로도 이미지가 들어가야 한다. 네이버 블로그가 그렇게 동작한다.
  useEffect(() => {
    if (!editor || !onUploadImage) return
    const dom = editor.view.dom

    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? [])[0]
      if (file?.type.startsWith('image/')) {
        e.preventDefault()
        void insertImageFile(file)
      }
    }
    const onDrop = (e: DragEvent) => {
      const file = Array.from(e.dataTransfer?.files ?? [])[0]
      if (file?.type.startsWith('image/')) {
        e.preventDefault()
        void insertImageFile(file)
      }
    }
    dom.addEventListener('paste', onPaste)
    dom.addEventListener('drop', onDrop)
    return () => {
      dom.removeEventListener('paste', onPaste)
      dom.removeEventListener('drop', onDrop)
    }
  }, [editor, onUploadImage, insertImageFile])

  if (!editor) return null

  const setHeading = (level: 0 | 1 | 2 | 3) => {
    if (level === 0) editor.chain().focus().setParagraph().run()
    else editor.chain().focus().toggleHeading({ level }).run()
  }

  const addLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('링크 주소', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addImage = () => {
    if (onUploadImage) fileRef.current?.click()
    else {
      const url = window.prompt('이미지 주소')
      if (url) editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* 도구 모음 — 스크롤해도 붙어 있게 한다. 긴 글을 쓸 때 위로 올라가서
          버튼을 찾는 것이 가장 성가시다. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <select
          value={FONTS.find((f) => editor.isActive('textStyle', { fontFamily: f.value }))?.value ?? ''}
          onChange={(e) => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontFamily(v).run()
            else editor.chain().focus().unsetFontFamily().run()
          }}
          className="h-8 rounded border border-neutral-200 bg-white px-2 text-[13px] text-neutral-700"
          title="글꼴"
        >
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          value={SIZES.find((s) => s.level !== 0 && editor.isActive('heading', { level: s.level }))?.level ?? 0}
          onChange={(e) => setHeading(Number(e.target.value) as 0 | 1 | 2 | 3)}
          className="h-8 rounded border border-neutral-200 bg-white px-2 text-[13px] text-neutral-700"
          title="글자 크기"
        >
          {SIZES.map((s) => (
            <option key={s.level} value={s.level}>{s.label}</option>
          ))}
        </select>

        <Divider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        {/* 글자색 */}
        <div className="relative">
          <ToolbarButton onClick={() => setShowColors((v) => !v)} active={showColors} title="글자 색">
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          {showColors && (
            <div className="absolute left-0 top-9 z-20 grid w-[184px] grid-cols-7 gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { editor.chain().focus().setColor(c).run(); setShowColors(false) }}
                  className="h-6 w-6 rounded border border-neutral-200"
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`색상 ${c}`}
                />
              ))}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColors(false) }}
                className="col-span-7 mt-1 rounded border border-neutral-200 py-1 text-[12px] text-neutral-600 hover:bg-neutral-50"
              >
                색 지우기
              </button>
            </div>
          )}
        </div>

        <Divider />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="링크">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="이미지" disabled={uploading}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="표"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="실행 취소">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시 실행">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        {uploading && (
          <span className="ml-2 flex items-center gap-1 text-[12px] text-neutral-500">
            <Type className="h-3 w-3 animate-pulse" />
            이미지 올리는 중…
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void insertImageFile(f)
          e.target.value = ''
        }}
      />

      <EditorContent
        editor={editor}
        className="ongo-editor min-h-[380px] px-4 py-3 text-[15px] leading-[1.75] text-neutral-800"
      />
    </div>
  )
}

export default RichEditor
