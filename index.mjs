#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'
import https from 'https'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const targetDir = process.argv[2] || 'my-nuxt-app'
const templateDir = path.join(__dirname, 'template')

const availableModules = [
  {
    name: '@nuxt/icon',
    description: 'Icon library with 200,000+ icons',
    category: 'UI'
  },
  {
    name: '@nuxtjs/color-mode',
    description: 'Dark mode support',
    category: 'UI'
  },
  {
    name: '@nuxt/image',
    description: 'Image optimization',
    category: 'Performance'
  },
  { name: '@pinia/nuxt', description: 'State management', category: 'Core' },
  {
    name: '@vueuse/nuxt',
    description: 'Vue composition utilities',
    category: 'Utilities'
  },
  {
    name: '@nuxtjs/i18n',
    description: 'Internationalization',
    category: 'Core'
  },
  {
    name: '@nuxt/content',
    description: 'The file-based CMS with support for Markdown, YAML, JSON',
    category: 'Content'
  },
  {
    name: '@nuxtjs/supabase',
    description: 'First class integration with Supabase',
    category: 'Core'
  }
]

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || ''

  if (process.versions.bun || userAgent.startsWith('bun')) {
    return 'bun'
  }
  if (userAgent.startsWith('pnpm')) {
    return 'pnpm'
  }
  if (userAgent.startsWith('yarn')) {
    return 'yarn'
  }
  if (userAgent.startsWith('npm')) {
    return 'npm'
  }

  return 'npm'
}

const packageManager = detectPackageManager()

function getInstallCommand() {
  switch (packageManager) {
    case 'bun':
      return 'bun install'
    case 'pnpm':
      return 'pnpm install'
    case 'yarn':
      return 'yarn'
    case 'npm':
    default:
      return 'npm install'
  }
}

function getDevCommand() {
  switch (packageManager) {
    case 'bun':
    case 'pnpm':
    case 'npm':
      return `${packageManager} run dev`
    case 'yarn':
      return 'yarn dev'
    default:
      return 'npm run dev'
  }
}

async function getLatestVersion(packageName) {
  return new Promise((resolve) => {
    https
      .get(
        `https://registry.npmjs.org/${packageName}/latest`,
        {
          headers: {
            'User-Agent': 'nuxt-starter-cli'
          }
        },
        (res) => {
          let data = ''

          if (res.statusCode !== 200) {
            res.resume()
            return resolve('latest')
          }

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              resolve(json.version || 'latest')
            } catch (error) {
              resolve('latest')
            }
          })
        }
      )
      .on('error', (error) => {
        resolve('latest')
      })
  })
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function selectModules() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const selected = new Array(availableModules.length).fill(false)
  let currentIndex = 0

  return new Promise((resolve) => {
    const stdin = process.stdin
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    function render() {
      readline.cursorTo(process.stdout, 0, 0)
      readline.clearScreenDown(process.stdout)

      const primary = '\x1b[38;2;235;20;56m' // #eb1438
      const dim = '\x1b[2m'
      const reset = '\x1b[0m'
      const underline = '\x1b[4m'

      console.log('')
      console.log(`${primary}◇${reset} Modules loaded`)
      console.log('')
      console.log(`${primary}◆${reset} Pick the modules to install:`)

      availableModules.forEach((mod, index) => {
        const isSelected = selected[index]
        const isCurrent = index === currentIndex

        const prefix = `${primary}│${reset}`
        const checkbox = isSelected ? `${primary}◼${reset}` : '◻'

        let name = mod.name
        if (isSelected) {
          name = `${primary}${name}${reset}`
        }

        if (isCurrent) {
          name = `${underline}${name}${reset}`
        }

        console.log(
          `${prefix} ${checkbox} ${name} ${dim}- ${mod.description}${reset}`
        )
      })

      // console.log(`${primary}│${reset}`)
    }

    function handleKey(key, data) {
      if (key === '\u0003') {
        process.exit()
      }

      if (key === '\u001b[A') {
        currentIndex = Math.max(0, currentIndex - 1)
        render()
      } else if (key === '\u001b[B') {
        currentIndex = Math.min(availableModules.length - 1, currentIndex + 1)
        render()
      } else if (key === ' ') {
        selected[currentIndex] = !selected[currentIndex]
        render()
      } else if (key === '\r' || key === '\n') {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.removeListener('data', handleKey)
        rl.close()

        const selectedModules = availableModules.filter((_, i) => selected[i])
        resolve(selectedModules)
      }
    }

    stdin.on('data', handleKey)
    render()
  })
}

async function selectUIFramework() {
  const frameworks = [
    {
      name: 'tailwindcss',
      label: 'TailwindCSS',
      description: 'Utility-first CSS framework'
    },
    {
      name: '@nuxt/ui',
      label: '@nuxt/ui',
      description: 'Nuxt UI library (includes Tailwind)'
    }
  ]

  let currentIndex = 0

  return new Promise((resolve) => {
    const stdin = process.stdin
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    const primary = '\x1b[38;2;235;20;56m' // #eb1438
    const dim = '\x1b[2m'
    const reset = '\x1b[0m'

    function render() {
      readline.cursorTo(process.stdout, 0, 0)
      readline.clearScreenDown(process.stdout)

      console.log('')
      console.log(`${primary}◆${reset} Select UI framework:`)
      console.log('')

      frameworks.forEach((fw, index) => {
        const isCurrent = index === currentIndex
        const prefix = isCurrent ? `${primary}›${reset}` : ' '
        const radio = isCurrent ? `${primary}●${reset}` : '○'
        const label = isCurrent ? `${primary}${fw.label}${reset}` : fw.label
        console.log(
          `  ${prefix} ${radio} ${label} ${dim}- ${fw.description}${reset}`
        )
      })

      console.log('')
      console.log(`${dim}↑/↓ to navigate, Enter to confirm${reset}`)
    }

    function handleKey(key) {
      if (key === '\u001b[A') {
        // Up arrow
        currentIndex =
          (currentIndex - 1 + frameworks.length) % frameworks.length
        render()
      } else if (key === '\u001b[B') {
        // Down arrow
        currentIndex = (currentIndex + 1) % frameworks.length
        render()
      } else if (key === '\r' || key === '\n') {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.removeListener('data', handleKey)
        resolve(frameworks[currentIndex].name)
      } else if (key === '\u0003') {
        // Ctrl+C
        process.exit(0)
      }
    }

    stdin.on('data', handleKey)
    render()
  })
}

async function runInstall(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ')
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'inherit', 'inherit']
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with code ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

async function main() {
  const isCurrentDir = targetDir === '.' || targetDir === './'
  const actualDir = isCurrentDir ? process.cwd() : targetDir
  const displayDir = isCurrentDir ? '当前目录' : targetDir

  console.log(`🚀 Creating Nuxt + TailwindCSS project in ${displayDir}...`)

  if (isCurrentDir) {
    // Check if current directory is empty (ignore hidden files like .git)
    const files = fs.readdirSync(actualDir).filter((f) => !f.startsWith('.'))
    if (files.length > 0) {
      console.error(`❌ Error: 当前目录不为空，请在空目录中执行`)
      process.exit(1)
    }
  } else if (fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory "${targetDir}" already exists`)
    process.exit(1)
  } else {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true })
        copyDir(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }

  copyDir(templateDir, actualDir)

  const uiFramework = await selectUIFramework()
  const selectedModules = await selectModules()

  console.log('📦 Fetching latest versions...')

  const packageJsonPath = path.join(actualDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  const nuxtVersion = await getLatestVersion('nuxt')

  const toVersion = (version) =>
    version === 'latest' ? version : `^${version}`

  packageJson.dependencies.nuxt = toVersion(nuxtVersion)

  const modules = []

  // Handle UI framework selection
  if (uiFramework === 'tailwindcss') {
    const tailwindVersion = await getLatestVersion('tailwindcss')
    const tailwindViteVersion = await getLatestVersion('@tailwindcss/vite')
    packageJson.devDependencies.tailwindcss = toVersion(tailwindVersion)
    packageJson.devDependencies['@tailwindcss/vite'] =
      toVersion(tailwindViteVersion)
    console.log(`   tailwindcss: ${tailwindVersion}`)
    console.log(`   @tailwindcss/vite: ${tailwindViteVersion}`)
  } else if (uiFramework === '@nuxt/ui') {
    const nuxtUiVersion = await getLatestVersion('@nuxt/ui')
    packageJson.dependencies['@nuxt/ui'] = toVersion(nuxtUiVersion)
    modules.push('@nuxt/ui')
    console.log(`   @nuxt/ui: ${nuxtUiVersion}`)
    // Remove tailwindcss related deps and config since @nuxt/ui handles it
    delete packageJson.devDependencies.tailwindcss
    delete packageJson.devDependencies['@tailwindcss/vite']
  }

  for (const mod of selectedModules) {
    const version = await getLatestVersion(mod.name)
    packageJson.dependencies[mod.name] = toVersion(version)
    modules.push(mod.name)
    console.log(`   ${mod.name}: ${version}`)
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

  if (modules.length > 0) {
    const nuxtConfigPath = path.join(actualDir, 'nuxt.config.ts')
    let nuxtConfig = fs.readFileSync(nuxtConfigPath, 'utf-8')

    const modulesStr = modules.map((m) => `'${m}'`).join(',\n    ')

    let configStr = `modules: [\n    ${modulesStr}\n  ],`

    if (modules.includes('@nuxtjs/i18n')) {
      configStr += `\n  i18n: {\n    locales: ['en', 'fr'],\n    defaultLocale: 'en',\n    strategy: 'prefix_except_default'\n  },`
    }

    if (modules.includes('@nuxtjs/supabase')) {
      configStr += `\n  supabase: {\n    redirect: false\n  },`
    }

    nuxtConfig = nuxtConfig.replace(
      /export default defineNuxtConfig\(\{/,
      `export default defineNuxtConfig({\n  ${configStr}`
    )

    fs.writeFileSync(nuxtConfigPath, nuxtConfig)
  }

  console.log(`   nuxt: ${nuxtVersion}`)
  console.log(`📦 Installing dependencies with ${packageManager}...`)
  process.chdir(actualDir)

  try {
    await runInstall(getInstallCommand())
    console.log('✅ Installation complete!')

    // UI improvement: Boxed Next Steps
    const commands = isCurrentDir
      ? [getDevCommand()]
      : [`cd ${targetDir}`, getDevCommand()]

    const maxLen = Math.max(...commands.map((c) => c.length)) + 5 // +5 for '   › ' padding
    const boxWidth = Math.max(20, maxLen + 4) // +4 for box borders and minimal padding

    const topBorder = '╭' + '─'.repeat(boxWidth) + '╮'
    const bottomBorder = '╰' + '─'.repeat(boxWidth) + '╯'

    const title = 'Next steps'
    const titleLen = title.length
    const titleStart = 2

    // Construct top border with title
    // ╭── 👉 Next steps ───╮
    // '╭' + '─'*2 + ' ' + title + ' ' + '─' * (boxWidth - 2 - 1 - titleLen - 1) + '╮'
    let topLine = topBorder
    if (boxWidth > titleLen + 4) {
      const leftDash = '─'.repeat(2)
      const rightDash = '─'.repeat(boxWidth - 2 - titleLen - 2)
      topLine = `╭${leftDash} ${title} ${rightDash}╮`
    }

    console.log('')
    console.log(topLine)
    console.log(`│${' '.repeat(boxWidth)}│`) // Empty line

    commands.forEach((cmd) => {
      const content = `   › ${cmd}`
      const padding = boxWidth - content.length
      console.log(`│${content}${' '.repeat(padding)}│`)
    })

    console.log(`│${' '.repeat(boxWidth)}│`) // Empty line
    console.log(bottomBorder)
    console.log('')
  } catch (error) {
    console.error('❌ Error during installation:', error.message)
    process.exit(1)
  }
}

main()
