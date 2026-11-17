// The top of the sign-in and sign-up screens (prototype v2): who runs the service,
// then the two route lines with a bus on them, drawn in the routes' own colours.
function AuthCrest({ heading }) {
  return (
    <div className="auth-crest-block">
      <div className="auth-crest">
        <img src={`${import.meta.env.BASE_URL}ku-shield.png`} alt="Kuwait University logo" />
        <div>
          <div className="auth-crest-name">Kuwait University</div>
          <div className="auth-crest-sub">Shadadiya campus buses</div>
        </div>
      </div>
      <h2 className="auth-heading">{heading}</h2>
      <div className="auth-lines" aria-hidden="true">
        <span></span>
        <span></span>
        <i></i>
      </div>
    </div>
  )
}

export default AuthCrest
