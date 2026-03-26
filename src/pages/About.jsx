import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import styles from './About.module.css'

export default function About() {
  const values = [
    { num: '01', title: 'Every property, personally inspected', text: 'Before any property appears on NammaStays, we visit it ourselves. We check the quality, the interiors, the staff, the linens, the cleanliness — everything. If it doesn\'t meet our standard, it doesn\'t get listed. Simple.' },
    { num: '02', title: 'Zero issues for every guest', text: 'Our core promise is straightforward: whoever books a stay with us should face no issues. We ensure everything is in order before you arrive so you can simply walk in and enjoy.' },
    { num: '03', title: 'Quality is non-negotiable', text: 'We\'ve turned down properties that looked beautiful on photos but had issues on the ground — unresponsive hosts, poorly maintained spaces, staff that wasn\'t prepared. If we wouldn\'t be comfortable sending our own family, we don\'t list it.' },
    { num: '04', title: 'The finest stay, not just a stay', text: 'We want every guest to leave saying it was the best stay of their life. That means getting the small things right — the welcome, the comfort, the responsiveness. Every time, without exception.' },
  ]

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLine} />
        <h1 className={styles.heroTitle}>One simple aim:<br /><em>zero issues,</em><br />finest experience.</h1>
        <p className={styles.heroSub}>NammaStays was built on one belief: whoever books a stay with us should have no issues, no surprises, and no disappointments. We make that possible by personally inspecting every property before it's approved — checking quality, comfort, and every detail so you don't have to.</p>
      </div>

      {/* Story */}
      <div className={styles.story}>
        <div className={styles.storyLeft}>
          <div className="section-label">Our Story</div>
          <div className="gold-line" style={{ margin: '16px 0 24px' }} />
          <h2 className={styles.storyTitle}>Started with a simple promise</h2>
        </div>
        <div className={styles.storyRight}>
          <p>NammaStays started when our founder had one recurring frustration: guests booking beautiful-looking properties and arriving to find things wrong — unclean spaces, unresponsive hosts, misleading photos. The experience never matched the expectation.</p>
          <br />
          <p>The solution wasn't a better review system. It was personal inspection. Before any property goes live on NammaStays, someone from our team visits it — checks the quality, walks through every room, meets the host, and only then gives approval.</p>
          <br />
          <p>Today, NammaStays lists fewer than 50 properties across India. Every single one personally inspected. That's not a limitation — that's the product.</p>
        </div>
      </div>

      {/* Values */}
      <div className={styles.values}>
        <div className="section-label" style={{ marginBottom: 60, textAlign: 'center' }}>What We Believe</div>
        {values.map((v, i) => (
          <div key={i} className={styles.valueRow}>
            <div className={styles.valueNum}>{v.num}</div>
            <div className={styles.valueContent}>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueText}>{v.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { n: '47', l: 'Properties across India' },
          { n: '2%', l: 'Acceptance rate' },
          { n: '4.97', l: 'Average guest rating' },
          { n: '18', l: 'States represented' },
        ].map(s => (
          <div key={s.l} className={styles.stat}>
            <div className={styles.statNum}>{s.n}</div>
            <div className={styles.statLabel}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready for a stay with zero worries?</h2>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/properties" className="btn-gold">Explore Properties <ArrowRight size={14} /></Link>
          <Link to="/list" className="btn-outline">List Your Property</Link>
        </div>
      </div>

      <section id="privacy" className={styles.legal} aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className={styles.legalTitle}>Privacy</h2>
        <p className={styles.legalText}>
          NammaStays collects only what we need to run bookings and host payouts — contact details, stay preferences, and verification data you choose to share. We do not sell personal data. Until your deployment uses a central server, information you enter may stay on your device; see our full <Link to="/privacy">Privacy</Link> page for details.
        </p>
      </section>

      <section id="terms" className={styles.legal} aria-labelledby="terms-heading">
        <h2 id="terms-heading" className={styles.legalTitle}>Terms of use</h2>
        <p className={styles.legalText}>
          Use of this platform is subject to our <Link to="/terms">Terms of service</Link>, including cancellation rules, host obligations, and dispute resolution. Listings and availability are managed by hosts and the platform; always confirm details before you travel.
        </p>
      </section>

      <Footer />
    </div>
  )
}

