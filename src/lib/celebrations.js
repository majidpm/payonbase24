import confetti from 'canvas-confetti'

// Confetti برای donation موفق
export function celebrateDonation() {
  const duration = 3000
  const end = Date.now() + duration

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}

// Confetti ساده برای success
export function celebrateSuccess() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#8b5cf6', '#ec4899']
  })
}

// Confetti برای travel fund complete
export function celebrateFundComplete() {
  const duration = 5000
  const end = Date.now() + duration

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    })
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()
}