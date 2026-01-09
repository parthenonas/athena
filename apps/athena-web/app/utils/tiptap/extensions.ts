import { Node, mergeAttributes, type CommandProps } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import Image from '@tiptap/extension-image'
import ImageNode from '~/components/common/nodes/Image.vue'
import VideoNode from '~/components/common/nodes/Video.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: () => ReturnType
    }
  }
}

export const CustomImage = Image.extend({
  addNodeView() {
    return VueNodeViewRenderer(ImageNode)
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null
      },
      alt: {
        default: null
      },
      id: {
        default: null
      }
    }
  }
})

export const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null
      },
      type: {
        default: 'video/mp4'
      },
      id: { default: null }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
        getAttrs: (node: string | HTMLElement) => ({
          src: (node as HTMLElement).getAttribute('src')
        })
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: 'true' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(VideoNode)
  },

  addCommands() {
    return {
      setVideo: () => ({ commands }: CommandProps) => {
        return commands.insertContent({ type: this.name })
      }
    }
  }
})
