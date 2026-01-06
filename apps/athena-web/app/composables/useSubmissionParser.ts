import { ExecutionStatus, type SubmissionResult } from '@athena/types'

export interface ParsedSubmission {
  statusLabel: string
  formattedOutput: string
  isError: boolean
  stats?: string
}

export const useSubmissionParser = () => {
  const { t } = useI18n()

  const parseSubmission = (result: SubmissionResult): ParsedSubmission => {
    const { status, stdout, stderr, compileOutput, message, time, memory } = result

    let isError = false

    switch (status) {
      case ExecutionStatus.Accepted:
        isError = false
        break
      case ExecutionStatus.WrongAnswer:
      case ExecutionStatus.TimeLimitExceeded:
      case ExecutionStatus.WallTimeLimitExceeded:
      case ExecutionStatus.MemoryLimitExceeded:
        isError = true
        break
      case ExecutionStatus.CompilationError:
      case ExecutionStatus.RuntimeError:
      case ExecutionStatus.SystemError:
        isError = true
        break
      case ExecutionStatus.Processing:
      case ExecutionStatus.InQueue:
        isError = false
        break
    }

    const statusLabel = t(`execution.status.${status}`)

    let stats = ''
    if (time !== undefined || memory !== undefined) {
      const parts = []
      if (time !== undefined) parts.push(`${time.toFixed(3)}s`)
      if (memory !== undefined) parts.push(`${(memory / 1024).toFixed(1)}MB`)
      stats = parts.join(' / ')
    }

    const outputParts: string[] = []

    if (compileOutput) {
      outputParts.push(`[COMPILER]\n${compileOutput}`)
    }

    if (message) {
      outputParts.push(`[SYSTEM]\n${message}`)
    }

    if (stderr) {
      outputParts.push(`[STDERR]\n${stderr}`)
    }

    if (stdout) {
      if (outputParts.length > 0) {
        outputParts.push('----------------------------------------')
        outputParts.push('[STDOUT]')
      }
      outputParts.push(stdout)
    }

    if (outputParts.length === 0 && status !== ExecutionStatus.InQueue && status !== ExecutionStatus.Processing) {
      outputParts.push(t('blocks.code.console.empty'))
    }

    return {
      statusLabel,
      formattedOutput: outputParts.join('\n\n'),
      isError,
      stats
    }
  }

  return {
    parseSubmission
  }
}
