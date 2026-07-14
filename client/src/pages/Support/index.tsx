import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/index.js';
import { ROUTES } from '../../utils/constants.js';
import styles from './Support.module.css';

// SVG Icons
const SearchIcon = () => (
  <svg className={styles.searchIcon} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const DiscordIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const DisputeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

interface SupportItem {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  icon: React.ReactNode;
  url: string;
}

interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

export const Support: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const supportItems: SupportItem[] = [
    {
      id: 'discord',
      title: 'Community support',
      description: 'Join our Discord community to discuss online shopping safety with other buyers, verify handles, and share transaction reports.',
      buttonText: 'Join us on Discord',
      icon: <DiscordIcon />,
      url: 'https://discord.gg/verifyng'
    },
    {
      id: 'scam-reports',
      title: 'Report a scam',
      description: 'Fell victim to a scam (non-delivery, blocked after payment, bait-and-switch)? File a report to alert the moderation team.',
      buttonText: 'Submit scam report',
      icon: <DisputeIcon />,
      url: 'https://tally.so/r/verifyng-scam'
    },
    {
      id: 'disputes',
      title: 'Disputes & claims',
      description: 'Need to dispute a review left on your profile, report false claims, or make a generic moderation request?',
      buttonText: 'Open dispute ticket',
      icon: <DocumentIcon />,
      url: 'https://tally.so/r/verifyng-dispute'
    }
  ];

  const faqItems: FAQItem[] = [
    {
      category: 'Vendor Operations',
      question: 'How do I claim my vendor profile?',
      answer: 'To claim your profile, find your business in the directory and click the "Claim Profile" button. You will be prompted to register as a Vendor and upload verification details (such as Government ID, Social handles, or registration documents).'
    },
    {
      category: 'Trust Score',
      question: 'What is the VerifyNG Trust Score?',
      answer: 'The Trust Score is a weighted rating from 0.0 to 10.0 calculated entirely from community reviews. It normalizes ratings and applies multipliers for verified buyers and recent feedback (submitted within 90 days).'
    },
    {
      category: 'Reviews',
      question: 'Can I edit or delete my review?',
      answer: 'You can edit or update your submitted reviews within a 48-hour window from your user dashboard. After 48 hours, reviews are permanently locked to preserve community review integrity.'
    },
    {
      category: 'AI Summaries',
      question: 'How does AI review summary work?',
      answer: 'Once a vendor accumulates 3 or more reviews, our backend automatically triggers an AI pipeline to extract key signals. It generates summaries on delivery reliability, satisfaction, and recurring complaints without manual moderation.'
    },
    {
      category: 'Scam & Moderation',
      question: 'How do I report a scam vendor?',
      answer: 'Search for the vendor in our directory, click the "Report Scam" button, and fill out details of the payment/transaction channel. The platform programmatically flags accounts once the scam threshold is crossed.'
    }
  ];

  // ⌘K Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus search input inside modal
  useEffect(() => {
    if (isModalOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isModalOpen]);

  // Reset active and expanded FAQs on query or modal state changes
  useEffect(() => {
    setActiveIndex(-1);
    setExpandedFaq(null);
  }, [modalQuery, isModalOpen]);

  // Filter FAQs based on query
  const filteredFaqs = faqItems.filter(faq =>
    faq.question.toLowerCase().includes(modalQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(modalQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(modalQuery.toLowerCase())
  );

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (filteredFaqs.length > 0 ? (prev + 1) % filteredFaqs.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (filteredFaqs.length > 0 ? (prev - 1 + filteredFaqs.length) % filteredFaqs.length : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredFaqs.length) {
        toggleFaq(activeIndex);
      }
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Main Body */}
      <main className={styles.main}>
        {/* Header */}
        <section className={styles.headerSection}>
          <span className={styles.supportLabel}>Support</span>
          <h1 className={styles.supportTitle}>Hello, how can we help?</h1>
          
          <div className={styles.searchContainer}>
            <button className={styles.searchBarTrigger} onClick={() => setIsModalOpen(true)}>
              <SearchIcon />
              <span className={styles.searchPlaceholder}>How do I claim my profile?</span>
              <span className={styles.shortcutBadge}>⌘ K</span>
            </button>
          </div>
        </section>

        {/* Grid Cards */}
        <section className={styles.grid}>
          {supportItems.map((item) => (
            <div key={item.id} className={styles.card}>
              <h2 className={styles.cardHeading}>{item.title}</h2>
              <p className={styles.cardText}>{item.description}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.cardButton} ${item.id === 'discord' ? styles.discordBtn : ''}`}
              >
                {item.icon}
                {item.buttonText}
              </a>
            </div>
          ))}
        </section>

        {/* Bottom Banner */}
        <section className={styles.bottomBanner}>
          <h2 className={styles.bannerTitle}>Can't find what you're looking for?</h2>
          <div className={styles.bannerRight}>
            <p className={styles.bannerText}>
              The VerifyNG Support Team is ready to help. Open a support ticket to dispute reviews, report scam transactions, or claim profiles. We typically respond within 24–48 hours.
            </p>
            <div className={styles.bannerActions}>
              <a
                href="https://tally.so/r/verifyng-support"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryActionBtn}
              >
                Open support ticket
              </a>
              <Link to={ROUTES.DIRECTORY} className={styles.secondaryActionBtn}>
                Browse Directory
              </Link>
            </div>
          </div>
        </section>

        {/* Compliance badges */}
        <section className={styles.complianceRow}>
          <span className={styles.securityNote}>
            We protect your data. <a href="#" className={styles.securityLink}>More on Security</a>
          </span>
          <span className={styles.complianceBadge}>
            <span className={styles.badgeCheck}>✓</span> NDPR Compliant
          </span>
          <span className={styles.complianceBadge}>
            <span className={styles.badgeCheck}>✓</span> Secure JWT Auth
          </span>
          <span className={styles.complianceBadge}>
            <span className={styles.badgeCheck}>✓</span> SSL Encrypted
          </span>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} VerifyNG. Built to foster safe commerce in Nigeria.</p>
      </footer>

      {/* ── COMMAND PALETTE SEARCH MODAL ── */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search documentation and FAQs..."
                value={modalQuery}
                onChange={(e) => setModalQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className={styles.modalSearchInput}
              />
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                Esc
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <div className={styles.faqSectionTitle}>Frequently Asked Questions</div>
              
              {filteredFaqs.length > 0 ? (
                <div className={styles.faqList}>
                  {filteredFaqs.map((faq, index) => {
                    const isExpanded = expandedFaq === index;
                    const isActive = activeIndex === index;
                    return (
                      <div
                        key={index}
                        className={`${styles.faqItem} ${isActive ? styles.faqItemActive : ''}`}
                      >
                        <button className={styles.faqQuestionButton} onClick={() => toggleFaq(index)}>
                          <span className={styles.faqQuestionText}>
                            <span className={styles.categoryBadge}>{faq.category}</span>
                            <span className={styles.questionTitle}>{faq.question}</span>
                          </span>
                          <svg
                            className={`${styles.faqArrow} ${isExpanded ? styles.faqArrowExpanded : ''}`}
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className={styles.faqAnswer}>
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.noResults}>
                  No documentation found matching "{modalQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
