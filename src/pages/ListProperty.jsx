import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Upload, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { encodePhotosForStorage } from '../utils/imageEncode'
import Footer from '../components/Footer'
import styles from './ListProperty.module.css'

const STEPS = ['About You', 'Your Property', 'Details & Amenities', 'Payout & KYC', 'Submit']

const ACCEPT_IMAGE = /^image\/(jpeg|png|webp)$/i

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/

function normPan(s) {
  return String(s || '')
    .replace(/\s/g, '')
    .toUpperCase()
}

function normIfsc(s) {
  return String(s || '')
    .replace(/\s/g, '')
    .toUpperCase()
}

function normGst(s) {
  return String(s || '')
    .replace(/\s/g, '')
    .toUpperCase()
}

function normAccountDigits(s) {
  return String(s || '').replace(/\D/g, '')
}

function maskAccount(num) {
  const d = normAccountDigits(num)
  if (!d) return '—'
  if (d.length <= 4) return '****'
  return `••••••${d.slice(-4)}`
}

function maskPan(pan) {
  const p = normPan(pan)
  if (p.length !== 10) return pan ? '••••••••••' : '—'
  return `${p.slice(0, 2)}****${p.slice(8)}`
}

export default function ListProperty() {
  const { showToast, user, registerHostListing } = useApp()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const photosRef = useRef([])
  const [step, setStep] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [photos, setPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ownerName: '', ownerEmail: '', ownerPhone: '', ownerBio: '',
    propertyName: '', location: '', type: 'Villa', description: '',
    bedrooms: '', bathrooms: '', guests: '', sqft: '', pricePerNight: '',
    amenities: [], specialFeature: '',
    bankAccountHolderName: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    panNumber: '',
    gstin: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  photosRef.current = photos

  useEffect(() => {
    return () => {
      photosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl))
    }
  }, [])

  useEffect(() => {
    if (!user) return
    setForm(f => ({
      ...f,
      ownerEmail: f.ownerEmail.trim() ? f.ownerEmail : user.email || '',
      ownerName: f.ownerName.trim() ? f.ownerName : user.name || '',
      ownerPhone: f.ownerPhone.trim() ? f.ownerPhone : user.phone || '',
    }))
  }, [user])

  const addImageFiles = useCallback(
    (fileList) => {
      const raw = Array.from(fileList || [])
      const accepted = raw.filter(f => ACCEPT_IMAGE.test(f.type))
      if (raw.length > 0 && accepted.length === 0) {
        showToast('Please use JPEG, PNG, or WebP images.')
        return
      }
      if (accepted.length === 0) return
      setPhotos(prev => [
        ...prev,
        ...accepted.map(file => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ])
    },
    [showToast]
  )

  const removePhoto = (id) => {
    setPhotos(prev => {
      const item = prev.find(p => p.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(p => p.id !== id)
    })
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const onDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    addImageFiles(e.dataTransfer.files)
  }

  const amenityOptions = [
    'Private or plunge pool',
    'Rooftop / terrace seating',
    'Fully equipped kitchen',
    'In-house cook (on request)',
    'Caretaker / daily housekeeping',
    'Power backup (inverter or generator)',
    'High-speed Wi‑Fi',
    'AC in all rooms',
    'Parking on premises',
    'Laundry / washing machine',
    'Local home-style meals',
    'Ayurveda / yoga / wellness space',
    'Heritage / haveli / traditional architecture',
    'Hill, valley or plantation view',
    'Bonfire / outdoor dining',
    'Pickup from airport or railway station',
    'Kids play area / indoor games',
    'Gated property / night security',
  ]

  const toggleAmenity = (a) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
    }))
  }

  const validateKycStep = () => {
    const holder = form.bankAccountHolderName.trim()
    const bank = form.bankName.trim()
    const acct = normAccountDigits(form.bankAccountNumber)
    const ifsc = normIfsc(form.bankIfsc)
    const pan = normPan(form.panNumber)
    const gst = normGst(form.gstin)

    if (!holder) return 'Enter the account holder name as per bank records.'
    if (!bank) return 'Enter bank name.'
    if (acct.length < 9 || acct.length > 18) return 'Enter a valid bank account number (9–18 digits).'
    if (!IFSC_RE.test(ifsc)) return 'Enter a valid IFSC code (e.g. HDFC0001234).'
    if (!PAN_RE.test(pan)) return 'Enter a valid PAN (e.g. ABCDE1234F).'
    if (gst && !GSTIN_RE.test(gst)) return 'GSTIN must be 15 characters in standard format, or leave blank if not registered.'
    return null
  }

  const goNext = () => {
    if (step === 3) {
      const err = validateKycStep()
      if (err) {
        showToast(err)
        return
      }
    }
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    const email = (user?.email || form.ownerEmail || '').trim()
    if (!email) {
      showToast('Add your email in the About You step.')
      return
    }
    if (!form.propertyName?.trim() || !form.location?.trim()) {
      showToast('Property name and location are required.')
      return
    }
    const kycErr = validateKycStep()
    if (kycErr) {
      showToast(kycErr)
      return
    }

    setSaving(true)
    let photoDataUrls = []
    try {
      photoDataUrls = await encodePhotosForStorage(photos, showToast)
    } catch {
      showToast('Could not process photos — try smaller JPEG/PNG files.')
      setSaving(false)
      return
    }

    const pan = normPan(form.panNumber)
    const ifsc = normIfsc(form.bankIfsc)
    const gst = normGst(form.gstin) || null

    registerHostListing(email, {
      propertyName: form.propertyName.trim(),
      location: form.location.trim(),
      type: form.type,
      pricePerNight: form.pricePerNight,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      guests: form.guests,
      sqft: form.sqft,
      ownerName: form.ownerName,
      ownerPhone: form.ownerPhone,
      ownerBio: form.ownerBio,
      description: form.description,
      amenities: form.amenities,
      specialFeature: form.specialFeature,
      bankAccountHolderName: form.bankAccountHolderName.trim(),
      bankName: form.bankName.trim(),
      bankAccountNumber: normAccountDigits(form.bankAccountNumber),
      bankIfsc: ifsc,
      panNumber: pan,
      gstin: gst,
      photoDataUrls,
    })
    setSaving(false)
    showToast('Application submitted. Our team will review it within 7 days.')
    setTimeout(() => navigate('/'), 2000)
  }

  const standards = [
    'Property must be personally inspectable by our team',
    'You choose minimum nights, pricing, and availability — we do not impose a one-size template',
    'Host must be reachable and responsive for guest coordination',
    'Interiors, cleanliness & quality reviewed with you before the listing goes live',
    'We partner with owners who care about guest experience — expectations are aligned together',
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="section-label">For Property Owners</div>
        <h1 className={styles.title}>Submit Your Property</h1>
        <p className={styles.sub}>We personally visit and inspect every property before approving it. Our standard is simple: if a guest books it, they should have zero issues. If your property meets that bar, we'd love to list it.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* Step indicators */}
          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <div key={i} className={`${styles.stepItem} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
                <div className={styles.stepDot}>{i < step ? <Check size={12} /> : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Step 0: About You */}
          {step === 0 && (
            <div className={styles.formSection}>
              <h2 className={styles.formTitle}>Tell us about yourself</h2>
              <div className={styles.grid2}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" value={form.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} placeholder="+1 (000) 000-0000" />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">A brief introduction (optional)</label>
                <textarea className="form-input" rows={4} value={form.ownerBio} onChange={e => set('ownerBio', e.target.value)} placeholder="Tell us who you are and your relationship with this property..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Step 1: Property basics */}
          {step === 1 && (
            <div className={styles.formSection}>
              <h2 className={styles.formTitle}>About your property</h2>
              <div className={styles.grid2}>
                <div className={`form-group ${styles.full}`}>
                  <label className="form-label">Property Name</label>
                  <input className="form-input" value={form.propertyName} onChange={e => set('propertyName', e.target.value)} placeholder="e.g. Villa Serena" />
                </div>
                <div className={`form-group ${styles.full}`}>
                  <label className="form-label">Location (City, State)</label>
                  <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Udaipur, Rajasthan" />
                </div>
                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
                    {[
                      'Villa',
                      'Heritage haveli / homestay',
                      'Boutique homestay',
                      'Mountain / hill cottage',
                      'Farm stay',
                      'Beach / coastal home',
                      'Backwaters houseboat',
                      'Farmhouse / estate',
                      'Apartment / service apartment',
                      'Other',
                    ].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price per night (₹)</label>
                  <input className="form-input" type="number" value={form.pricePerNight} onChange={e => set('pricePerNight', e.target.value)} placeholder="e.g. 25000" />
                </div>
                <div className={`form-group ${styles.full}`}>
                  <label className="form-label">Property Description</label>
                  <textarea className="form-input" rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your property — its history, setting, what makes it unique..." style={{ resize: 'vertical' }} />
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                tabIndex={-1}
                className={styles.fileInput}
                onChange={(e) => {
                  addImageFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <div
                className={`${styles.uploadArea} ${dragActive ? styles.uploadAreaActive : ''}`}
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFilePicker()
                  }
                }}
                onDragOver={onDragOver}
                onDragEnter={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <Upload size={24} color="var(--muted)" aria-hidden />
                <div className={styles.uploadText}>Drag & drop photos here, or click to select</div>
                <div className={styles.uploadSub}>JPEG, PNG or WebP · More photos help review; high-res (e.g. 2000px+) when possible</div>
              </div>

              {photos.length > 0 && (
                <div className={styles.photoGrid} aria-live="polite">
                  {photos.map(p => (
                    <div key={p.id} className={styles.photoThumb}>
                      <img src={p.previewUrl} alt="" />
                      <button
                        type="button"
                        className={styles.photoRemove}
                        onClick={(e) => {
                          e.stopPropagation()
                          removePhoto(p.id)
                        }}
                        aria-label="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className={styles.formSection}>
              <h2 className={styles.formTitle}>Details & Amenities</h2>
              <div className={styles.grid4}>
                {[
                  { label: 'Bedrooms', key: 'bedrooms' },
                  { label: 'Bathrooms', key: 'bathrooms' },
                  { label: 'Max Guests', key: 'guests' },
                  { label: 'Sq. Footage', key: 'sqft' },
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input className="form-input" type="number" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder="0" />
                  </div>
                ))}
              </div>

              <div className={styles.sectionSub}>Select all amenities your property offers</div>
              <div className={styles.amenityGrid}>
                {amenityOptions.map(a => (
                  <div
                    key={a}
                    className={`${styles.amenityChip} ${form.amenities.includes(a) ? styles.amenitySelected : ''}`}
                    onClick={() => toggleAmenity(a)}
                  >
                    {form.amenities.includes(a) && <Check size={11} />}
                    {a}
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: 24 }}>
                <label className="form-label">What makes this property truly exceptional?</label>
                <textarea className="form-input" rows={4} value={form.specialFeature} onChange={e => set('specialFeature', e.target.value)} placeholder="The one thing guests will remember forever..." style={{ resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Step 3: Payout & KYC */}
          {step === 3 && (
            <div className={styles.formSection}>
              <h2 className={styles.formTitle}>Payout &amp; tax details</h2>
              <p className={styles.kycIntro}>
                We use these details only for owner payouts and tax compliance after your property is approved. Store this browser-side for demo — on production, data would be encrypted in transit and at rest.
              </p>

              <div className={styles.sectionSub} style={{ marginTop: 8 }}>Bank account (India)</div>
              <div className={styles.grid2}>
                <div className={`form-group ${styles.full}`}>
                  <label className="form-label">Account holder name</label>
                  <input
                    className="form-input"
                    value={form.bankAccountHolderName}
                    onChange={e => set('bankAccountHolderName', e.target.value)}
                    placeholder="As printed on bank statement / cheque"
                    autoComplete="name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank name</label>
                  <input
                    className="form-input"
                    value={form.bankName}
                    onChange={e => set('bankName', e.target.value)}
                    placeholder="e.g. HDFC Bank, State Bank of India"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account number</label>
                  <input
                    className="form-input"
                    inputMode="numeric"
                    value={form.bankAccountNumber}
                    onChange={e => set('bankAccountNumber', e.target.value)}
                    placeholder="Savings / current account number"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC code</label>
                  <input
                    className="form-input"
                    value={form.bankIfsc}
                    onChange={e => set('bankIfsc', normIfsc(e.target.value))}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className={styles.sectionSub} style={{ marginTop: 28 }}>Tax identifiers</div>
              <div className={styles.grid2}>
                <div className="form-group">
                  <label className="form-label">PAN <span className={styles.req}>*</span></label>
                  <input
                    className="form-input"
                    value={form.panNumber}
                    onChange={e => set('panNumber', normPan(e.target.value).slice(0, 10))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    spellCheck={false}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN <span className={styles.opt}>(optional)</span></label>
                  <input
                    className="form-input"
                    value={form.gstin}
                    onChange={e => set('gstin', normGst(e.target.value).slice(0, 15))}
                    placeholder="15-character GSTIN if registered"
                    maxLength={15}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className={styles.formSection}>
              <h2 className={styles.formTitle}>Review & Submit</h2>
              <div className={styles.reviewGrid}>
                <div className={styles.reviewItem}><span>Owner</span><strong>{form.ownerName || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Email</span><strong>{form.ownerEmail || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Property</span><strong>{form.propertyName || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Location</span><strong>{form.location || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Type</span><strong>{form.type}</strong></div>
                <div className={styles.reviewItem}><span>Price/Night</span><strong>{form.pricePerNight ? `₹${form.pricePerNight}` : '—'}</strong></div>
                <div className={styles.reviewItem}><span>Bedrooms</span><strong>{form.bedrooms || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Max Guests</span><strong>{form.guests || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Amenities</span><strong>{form.amenities.length > 0 ? form.amenities.join(', ') : '—'}</strong></div>
                <div className={styles.reviewItem}><span>Photos</span><strong>{photos.length > 0 ? `${photos.length} attached` : '—'}</strong></div>
                <div className={styles.reviewItem}><span>Bank</span><strong>{form.bankName || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Account</span><strong>{maskAccount(form.bankAccountNumber)} · {normIfsc(form.bankIfsc) || '—'}</strong></div>
                <div className={styles.reviewItem}><span>Account holder</span><strong>{form.bankAccountHolderName || '—'}</strong></div>
                <div className={styles.reviewItem}><span>PAN</span><strong>{maskPan(form.panNumber)}</strong></div>
                <div className={styles.reviewItem}><span>GSTIN</span><strong>{normGst(form.gstin) || 'Not registered'}</strong></div>
              </div>
              <p className={styles.submitNote}>By submitting, you confirm that all information is accurate and that you are authorised to list this property. Our team will reach out within 7 business days.</p>
            </div>
          )}

          {/* Navigation */}
          <div className={styles.navBtns}>
            {step > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn-gold"
                onClick={goNext}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className="btn-gold" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : (
                  <>Submit Application <ArrowRight size={14} /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar: Standards */}
        <div className={styles.sidebar}>
          <div className={styles.standardsCard}>
            <div className="section-label" style={{ marginBottom: 16 }}>NammaStays Standards</div>
            <p className={styles.standardsNote}>Every property is personally visited by our team. We check quality, interiors, and readiness before approving. Here's what we look for:</p>
            <ul className={styles.standardsList}>
              {standards.map((s, i) => (
                <li key={i} className={styles.standardItem}>
                  <Check size={12} color="var(--gold)" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className={styles.divider} />
            <p className={styles.contactNote}>Questions? Email <span style={{ color: 'var(--gold)' }}>owners@NammaStays.com</span></p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}



