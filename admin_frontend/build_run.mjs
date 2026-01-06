import('vite').then(async ({ build }) => {
  try {
    await build()
    console.log('BUILD_OK')
  } catch (e) {
    console.error('BUILD_ERR', e)
    process.exit(1)
  }
})


