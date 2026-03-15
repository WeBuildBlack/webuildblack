export function log(action, data = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), action, ...data }));
}

export function error(action, err) {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), action, error: err.message }));
}
