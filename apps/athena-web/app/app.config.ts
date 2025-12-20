export default defineAppConfig({
  ui: {
    colors: {
      primary: 'sky',
      neutral: 'zinc',
      gray: 'zinc'
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
      default: {
        size: 'md',
        variant: 'solid',
        loadingIcon: 'i-lucide-loader-2'
      },
      slots: {
        base: 'font-display font-bold uppercase tracking-wider transition-transform active:scale-[0.98]',
        rounded: 'rounded-md'
      }
    },
    input: {
      default: {
        size: 'md',
        color: 'neutral',
        variant: 'outline'
      },
      slots: {
        root: 'font-body shadow-sm',
        input: 'placeholder-gray-400 dark:placeholder-gray-500',
        rounded: 'rounded-md'
      }
    },
    card: {
      slots: {
        root: 'bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-xl',
        header: 'font-display font-bold uppercase tracking-wide border-b border-zinc-200 dark:border-zinc-800',
        rounded: 'rounded-lg'
      }
    },
    formGroup: {
      slots: {
        label: 'font-display font-bold uppercase text-xs tracking-wider text-zinc-500 dark:text-zinc-400 mb-1'
      }
    }
  }
})
