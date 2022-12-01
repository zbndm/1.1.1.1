import '../styles/base.styl'

async function init () {
  const form = <HTMLFormElement>document.getElementById('purge-cache-form')!
  const submitButton = <HTMLElement>document.getElementById('submit-button')!
  const info = <HTMLElement>document.getElementById('info-message')!

  form.onsubmit = function(evt) {
    evt.preventDefault()

    const params = new FormData(form)
    const qs = ['domain', 'type']
      .map(p => [p, params.get(p)])
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')

    setLoading(true)
    fetch(encodeURI(`/api/v1/purge?${qs}`), {
      method: 'POST'
    })
      .then(async res => {
        let msg = `(${res.status}) ${res.statusText}`
        try {
          const body = await res.json()
          msg = body.msg
        } catch (e) { /* no msg found, continue */ }
        setMessage(msg, !res.ok)
      })
      .catch(err => setMessage(err, true))
      .then(() => setLoading(false))
  }

  function setLoading (loading: boolean) {
    submitButton.setAttribute('value', loading ? 'Sending...' : 'Purge Cache')
    if (loading) {
      submitButton.setAttribute('disabled', '')
    } else {
      submitButton.removeAttribute('disabled')
    }
  }

  function setMessage (message: string, error: boolean) {
    info.textContent = message
    info.classList.add(error ? 'error' : 'success')
    info.classList.remove(!error ? 'error' : 'success')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
