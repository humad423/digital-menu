async function check() {
  try {
    const res = await fetch("https://alfsouq.com/m/alasil")
    console.log("alasil status:", res.status)
    const text = await res.text()
    console.log("alasil body length:", text.length)
    if (res.status !== 200) {
      console.log("alasil body preview:", text.slice(0, 500))
    }

    const res2 = await fetch("https://alfsouq.com/m/burger-k")
    console.log("burger-k status:", res2.status)
    const text2 = await res2.text()
    console.log("burger-k body length:", text2.length)
    if (res2.status !== 200) {
      console.log("burger-k body preview:", text2.slice(0, 500))
    }
  } catch (err) {
    console.error("Fetch error:", err)
  }
}

check()
