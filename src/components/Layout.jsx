import Icon from './Icon.jsx';
const organizationLogo = `${import.meta.env.BASE_URL}assets/gamechangers-ai-logo.png`;
export function Header({ onAbout, onSubscribe }) {
  return <header className="site-header">
    <div className="brand-lockup">
      <a className="organization-logo" href="https://gamechangersai.org/" aria-label="GameChangers AI home"><img src={organizationLogo} alt="GameChangers AI logo" width="88" height="88" /></a>
      <div className="brand-copy">
        <a href="#" className="brand" aria-label="Around Town home"><strong>Around Town</strong></a>
        <a className="brand-credit" href="https://gamechangersai.org/"><span>by</span> <strong>GameChangers AI</strong></a>
        <p className="brand-communities">Merced · Atwater · McSwain</p>
      </div>
    </div>
    <nav aria-label="Main navigation"><a href="#events">Events</a><button onClick={onAbout}>About</button><button onClick={onSubscribe}>Subscribe</button></nav>
  </header>;
}
export function Hero() {
  return <section className="hero"><div className="hero-copy"><h1>Good things happening<br className="desktop-break" /> close to home.</h1><p>Your community calendar for Merced, Atwater &amp; McSwain.</p></div><img src={`${import.meta.env.BASE_URL}assets/valley.png`} alt="" className="valley-illustration" /></section>;
}
export function SubscribeBand({ onSubscribe }) {
  return <section className="subscribe-band"><h2>Take your town with you.</h2><p>Subscribe once. See new events<br className="wide-rail-break" /> in your calendar.</p><button className="button button-light" onClick={onSubscribe}><Icon name="calendar" />Subscribe to calendar</button></section>;
}
export function Footer({ onAbout, onSubscribe }) {
  return <footer className="site-footer"><div className="footer-project"><a className="footer-logo" href="https://gamechangersai.org/" aria-label="GameChangers AI home"><img src={organizationLogo} alt="GameChangers AI logo" width="64" height="64" loading="lazy" /></a><div className="footer-project-copy"><p className="project-title">A community project from <a href="https://gamechangersai.org/">GameChangers AI<Icon name="external" size={15} /></a></p><p>Using AI to help neighbors discover what’s happening close to home.</p><p className="nonprofit-note">GameChangers AI is a 501(c)(3) nonprofit. <a href="https://gamechangersai.org/about.html">Learn about our mission.</a></p><p className="organizer-note">Sourced locally. Check with organizers for changes.</p></div></div><nav aria-label="Footer navigation"><a href="#events">Events</a><button onClick={onAbout}>About</button><button onClick={onSubscribe}>Subscribe</button></nav></footer>;
}
