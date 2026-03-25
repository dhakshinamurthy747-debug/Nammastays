import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, MapPin, Users, BedDouble } from 'lucide-react'
import styles from './PropertyCard.module.css'

export default function PropertyCard({ property, index = 0, imageLoading = 'lazy' }) {
  const navigate = useNavigate()

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => navigate(`/property/${property.id}`)}
    >
      <div className={styles.image}>
        <img
          src={property.image}
          alt={property.name}
          className={styles.imageImg}
          loading={imageLoading}
          decoding="async"
          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = property.gradient; }}
        />
        <div className={styles.imageOverlay} />
        <div className={styles.type}>{property.type}</div>
        {!property.available && <div className={styles.unavailable}>Fully Booked</div>}
        <div className={styles.price}>
          <span className={styles.priceNum}>₹{property.price.toLocaleString('en-IN')}</span>
          <span className={styles.priceLabel}>/night</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.location}>
          <MapPin size={11} color="var(--sage-mid)" />
          <span>{property.location}</span>
        </div>
        <h3 className={styles.name}>{property.name}</h3>
        <p className={styles.tagline}>{property.tagline}</p>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <Users size={12} />
            <span>{property.guests} guests</span>
          </div>
          <div className={styles.metaItem}>
            <BedDouble size={12} />
            <span>{property.bedrooms} bedrooms</span>
          </div>
          <div className={styles.metaItem}>
            <Star size={12} fill="var(--gold)" color="var(--gold-light)" />
            <span>
              {property.newListing && !(property.reviews > 0)
                ? 'New'
                : `${property.rating} (${property.reviews})`}
            </span>
          </div>
        </div>

        <div className={styles.tags}>
          {property.tags.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
