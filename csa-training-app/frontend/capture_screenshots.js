import { spawn } from 'child_process'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  console.log('🚀 Starting automation suite...')

  // Create output directories
  const screenshotDir = path.resolve('../..', 'screenshots')
  const frameDir = path.resolve('.', 'temp_frames')
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })
  if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true })

  // 1. Boot FastAPI Backend
  console.log('📦 Launching FastAPI backend server...')
  const backend = spawn('..\\..\\.venv\\Scripts\\python.exe', ['run.py'], {
    cwd: path.resolve('..', 'backend'),
    shell: true,
  })

  backend.stdout.on('data', (data) => {
     console.log(`[Backend] ${data}`);
  })

  backend.stderr.on('data', (data) => {
     console.error(`[Backend ERR] ${data}`);
  })

  // 2. Boot Vite Frontend
  console.log('📦 Launching Vite frontend server...')
  const frontend = spawn('npx.cmd', ['vite'], {
    cwd: path.resolve('.'),
    shell: true,
  })

  frontend.stdout.on('data', (data) => {
    // console.log(`[Frontend] ${data}`);
  })

  // Wait 10 seconds for servers to fully load
  console.log('⏳ Waiting 10 seconds for dev servers to bind to ports 8000 and 5173...')
  await sleep(10000)

  // 3. Launch Puppeteer Browser
  console.log('🌐 Launching headless browser...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  let frameCounter = 0
  const captureFrame = async (name) => {
    const filename = path.join(frameDir, `frame_${String(frameCounter++).padStart(3, '0')}_${name}.png`)
    await page.screenshot({ path: filename })
    console.log(`📸 Frame captured: ${filename}`)
    await sleep(200)
  }

  try {
    // Navigate to Dashboard
    console.log('🌐 Navigating to Dashboard...')
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle2' })
    await sleep(2000)
    await page.screenshot({ path: path.join(screenshotDir, 'dashboard.png') })
    console.log('✓ Saved screenshots/dashboard.png')
    await captureFrame('dashboard')

    // Navigate to Content Library
    console.log('🌐 Navigating to Content Library...')
    await page.goto('http://localhost:5173/content', { waitUntil: 'networkidle2' })
    await sleep(2000)
    await page.screenshot({ path: path.join(screenshotDir, 'content.png') })
    console.log('✓ Saved screenshots/content.png')
    await captureFrame('content')

    // Navigate to Question Bank
    console.log('🌐 Navigating to Question Bank...')
    await page.goto('http://localhost:5173/questions', { waitUntil: 'networkidle2' })
    await sleep(2000)
    await page.screenshot({ path: path.join(screenshotDir, 'features.png') })
    console.log('✓ Saved screenshots/features.png')
    await captureFrame('questions')

    // Navigate to Flashcards
    console.log('🌐 Navigating to Flashcards...')
    await page.goto('http://localhost:5173/flashcards', { waitUntil: 'networkidle2' })
    await sleep(2000)
    await captureFrame('flashcards_grid')

    // Flip a flashcard if available
    console.log('🖱️ Clicking a flashcard to flip...')
    const card = await page.$('.flashcard-inner') || await page.$('[style*="transform"]')
    if (card) {
      await card.click()
      await sleep(1000)
      await captureFrame('flashcard_flipped')
    }

    // Navigate to AI Tutor
    console.log('🌐 Navigating to AI Tutor...')
    await page.goto('http://localhost:5173/tutor', { waitUntil: 'networkidle2' })
    await sleep(1500)
    await captureFrame('ai_tutor_empty')

    // Type a query in tutor chat
    console.log('✍️ Sending a query to AI Tutor...')
    const input = await page.$('input[placeholder*="Ask"]') || await page.$('input[type="text"]')
    const sendBtn = await page.$('button[type="submit"]') || await page.$('button.btn-primary')
    if (input && sendBtn) {
      await input.type('What is the difference between client scripts and business rules?')
      await sleep(500)
      await captureFrame('ai_tutor_typing')
      await sendBtn.click()
      console.log('⏳ Waiting for AI Response to stream...')
      await sleep(7000) // Wait for LLM stream response
      await captureFrame('ai_tutor_response')
    }

    // Navigate to Mock Tests
    console.log('🌐 Navigating to Mock Tests...')
    await page.goto('http://localhost:5173/tests', { waitUntil: 'networkidle2' })
    await sleep(2000)
    await captureFrame('mock_tests_selection')

    // Start a Test
    console.log('🖱️ Starting a mock test...')
    const startBtn = await page.$('button.btn-primary')
    if (startBtn) {
      await startBtn.click()
      await sleep(2000) // Wait for test screen to mount
      await captureFrame('mock_test_active')

      // Select an option (Option A)
      console.log('🖱️ Selecting Option A...')
      const optionBtn = await page.$('.option-btn')
      if (optionBtn) {
        await optionBtn.click()
        await sleep(500)
        await captureFrame('mock_test_selected')

        // Check Answer
        console.log('🖱️ Checking Answer...')
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const chk = buttons.find(b => b.textContent.includes('Check Answer'));
          if (chk) chk.click();
        });
        await sleep(1500)
        await captureFrame('mock_test_checked')
      }

      // Finish Test to get to Results Screen
      console.log('🖱️ Submitting test to load Results Page...')
      const finished = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const finishBtn = buttons.find(b => b.textContent.includes('Submit Test') || b.textContent.includes('Finish Test'));
        if (finishBtn) {
          finishBtn.click();
          return true;
        }
        return false;
      });
      if (finished) {
        await sleep(2500) // Wait for results processing
        await page.screenshot({ path: path.join(screenshotDir, 'results.png') })
        console.log('✓ Saved screenshots/results.png')
        await captureFrame('results_page')
      }
    }

    // Navigate to Progress Dashboard
    console.log('🌐 Navigating to Progress Dashboard...')
    await page.goto('http://localhost:5173/progress', { waitUntil: 'networkidle2' })
    await sleep(2000)
    await captureFrame('progress_dashboard')

    // Navigate to Settings
    console.log('🌐 Navigating to Settings...')
    await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle2' })
    await sleep(1500)
    await captureFrame('settings')

  } catch (error) {
    console.error('❌ Browser Automation error:', error)
  } finally {
    console.log('🔌 Cleaning up and shutting down servers...')
    await browser.close()
    
    // Kill processes
    backend.kill('SIGINT')
    frontend.kill('SIGINT')
    process.exit(0)
  }
}

main()
