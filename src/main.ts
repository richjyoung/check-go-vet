import * as core from '@actions/core'
import * as exec from '@actions/exec'

interface VetEntry {
  [pkg: string]: {
    [rule: string]: {
      posn: string
      message: string
    }[]
  }
}

interface Annotation {
  path: string
  start_line: number
  end_line: number
  start_column?: number
  end_column?: number
  annotation_level: string
  message: string
  title?: string
  raw_details?: string
}

async function run(): Promise<void> {
  try {
    let vetError = ''

    const options: exec.ExecOptions = {
      listeners: {
        stderr: (data: Buffer) => {
          vetError += data.toString()
        }
      },
      cwd: './'
    }

    await exec.exec('go', ['vet', '-json', './...'], options)

    let buf = ''
    const arr: VetEntry[] = []

    for (const line of vetError.split('\n')) {
      if (line.startsWith('#')) {
        if (buf !== '') {
          arr.push(JSON.parse(buf))
          buf = ''
        }
      } else {
        buf += line
      }
    }
    if (buf !== '') {
      arr.push(JSON.parse(buf))
      buf = ''
    }

    const annotations: Annotation[] = []

    const trimLen = process.cwd().length + 1

    for (const entry of arr) {
      for (const pkg in entry) {
        for (const rule in entry[pkg]) {
          for (const err of entry[pkg][rule]) {
            const [full_path, line, col] = err.posn.split(':')
            annotations.push({
              annotation_level: 'warning',
              path: full_path.substring(trimLen),
              start_line: parseInt(line),
              end_line: parseInt(line),
              start_column: parseInt(col),
              message: err.message,
              title: rule
            })

            core.warning(err.message, {
              startColumn: parseInt(col),
              startLine: parseInt(line),
              endLine: parseInt(line),
              file: full_path.substring(trimLen),
              title: rule
            })
          }
        }
      }
    }
    console.log(process.cwd())
    console.log(JSON.stringify(annotations, null, '  '))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
