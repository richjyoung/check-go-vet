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

async function run(): Promise<void> {
  try {
    const packages = core.getInput('packages', {required: false})
    const buildFlags = core.getInput('build-flags', {required: false})
    const vetFlags = core.getInput('vet-flags', {required: false})

    let vetError = ''

    const options: exec.ExecOptions = {
      listeners: {
        stderr: (data: Buffer) => {
          vetError += data.toString()
        }
      },
      cwd: './'
    }

    const retval = await exec.exec(
      'go',
      [
        'vet',
        ...buildFlags.split(' ').filter(x => !!x),
        '-json',
        ...vetFlags.split(' ').filter(x => !!x),
        packages
      ],
      options
    )

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

    const trimLen = process.cwd().length + 1

    let count = 0

    for (const entry of arr) {
      for (const pkg in entry) {
        for (const rule in entry[pkg]) {
          for (const err of entry[pkg][rule]) {
            const [full_path, line, col] = err.posn.split(':')

            core.warning(err.message, {
              startColumn: parseInt(col),
              startLine: parseInt(line),
              endLine: parseInt(line),
              file: full_path.substring(trimLen),
              title: `[vet] ${rule}`
            })
          }
        }
      }
    }

    if (retval !== 0 || count > 0) {
      core.setFailed(`go vet returned code ${retval}, ${count} warnings`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
