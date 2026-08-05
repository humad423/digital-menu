async function checkLocal() {
  try {
    const res = await fetch("http://localhost:3000/m/alasil")
    console.log("Local alasil status:", res.status)
    const text = await res.text()
    console.log("Local alasil body length:", text.length)
  } catch (err) {
    console.error("Local fetch error:", err)
  }
}

checkLocal()
