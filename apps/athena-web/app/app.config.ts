export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'slate',
      secondary: 'blue',
      success: 'emerald',
      info: 'cyan',
      warning: 'amber',
      error: 'red'
    },
    pageCTA: {
      slots: {
        root: '!bg-transparent !ring-0 shadow-none '
      }
    },
    header: {
      slots: {
        root: 'bg-white/75 dark:bg-gray-950/75 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors'
      }
    },

    footer: {
      slots: {
        root: 'bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 transition-colors'
      }
    },
    button: {
      slots: {
        base: 'font-display font-bold uppercase tracking-wider transition-transform active:scale-[0.98]'
      },
      variants: {
        variant: {
          link: 'font-body font-medium normal-case tracking-normal hover:underline p-0!'
        }
      }
    }
  }
})
