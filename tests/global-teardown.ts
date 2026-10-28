async function globalTeardown() {
  await fetch('http://127.0.0.1:3111/__test_shutdown').catch(() => undefined);
}

export default globalTeardown;
