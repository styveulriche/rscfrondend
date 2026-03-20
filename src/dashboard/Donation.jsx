import { useState } from 'react';
import { FaHandHoldingHeart, FaCheckCircle, FaUniversity, FaTimes, FaLock } from 'react-icons/fa';
import { StatsRow } from './Statistics';
import { useAuth } from '../context/AuthContext';
import { useDonationFlow } from '../hooks/useDonationFlow';

const presetAmounts = [500, 1000, 1500, 5000];

function SkipeModal({ amount, onConfirm, onClose }) {
  const [account, setAccount] = useState('');
  const [step, setStep] = useState(1); // 1=saisie, 2=confirmation, 3=succès
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [reference] = useState(() => `DON-${Date.now().toString().slice(-6)}`);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setErrorMsg('');
    try {
      await onConfirm(amount, account, reference);
      setStep(3);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Impossible de finaliser la transaction.';
      setErrorMsg(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '32px 28px',
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'none',
          border: 'none', cursor: 'pointer', color: '#999',
        }}>
          <FaTimes size={18} />
        </button>

        {/* En-tête Skipe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #8B1C1C, #C44040)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FaUniversity size={22} color="white" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#2C2C2C' }}>Paiement Skipe</p>
            <p style={{ fontSize: 13, color: '#888' }}>Transfert bancaire sécurisé</p>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmit}>
            <div style={{ background: 'var(--pink-ultra-light)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 4 }}>Montant du don</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--red-primary)' }}>{amount} $</p>
            </div>
            <label style={{ fontSize: 12, color: 'var(--text-gray)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Compte Skipe (email ou téléphone lié à votre banque)
            </label>
            <input
              className="form-input"
              type="text"
              placeholder="ex: jean.dupont@banque.ca ou +1 514 000 0000"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: 8 }}>
              <FaLock size={11} color="#888" />
              <span style={{ fontSize: 11, color: '#888' }}>Connexion chiffrée SSL — vos données sont protégées</span>
            </div>
            <button type="submit" className="btn-add" style={{ width: '100%', padding: '14px' }}>
              Continuer
            </button>
          </form>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-gray)', marginBottom: 20 }}>
              Veuillez confirmer la transaction suivante :
            </p>
            <div style={{ background: 'var(--pink-ultra-light)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
              {[
                { l: 'Compte Skipe', v: account },
                { l: 'Montant', v: `${amount} $` },
                { l: 'Bénéficiaire', v: 'RSC — Retour aux Sources Canada' },
                { l: 'Référence', v: reference },
              ].map(({ l, v }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-gray)' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{v}</span>
                </div>
              ))}
            </div>
            {errorMsg && (
              <div style={{ color: 'var(--red-primary)', fontSize: 12, marginBottom: 12 }}>{errorMsg}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => setStep(1)}
                style={{ padding: '13px', borderRadius: 8, border: '2px solid var(--pink-light)', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Modifier
              </button>
              <button onClick={handleConfirm} disabled={processing}
                className="btn-add" style={{ padding: '13px', opacity: processing ? 0.7 : 1 }}>
                {processing ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <FaCheckCircle size={56} color="#2e7d32" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#2e7d32', marginBottom: 8 }}>
              Don effectué avec succès !
            </h3>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
              Votre solde a été mis à jour. Merci pour votre contribution à la communauté RSC.
            </p>
            <button onClick={onClose} className="btn-add" style={{ padding: '12px 32px' }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Donation() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');
  const [showModal, setShowModal] = useState(false);
  const {
    status: feedback,
    submitting,
    submitDonation,
  } = useDonationFlow(user?.id);

  const amount = custom ? Number(custom) : selected;

  const handleConfirm = async (amt, account, reference) => {
    await submitDonation({ amount: amt, account, reference });
  };

  return (
    <div>
      <StatsRow />

      {showModal && amount > 0 && (
        <SkipeModal
          amount={amount}
          onConfirm={handleConfirm}
          onClose={() => { setShowModal(false); setSelected(null); setCustom(''); }}
        />
      )}

      <div className="content-card">
        {feedback && (
          <div style={{
            background: feedback.type === 'success' ? 'rgba(46,125,50,0.1)' : 'rgba(198,40,40,0.1)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(46,125,50,0.3)' : 'rgba(198,40,40,0.3)'}`,
            color: feedback.type === 'success' ? '#2e7d32' : '#c62828',
            padding: '10px 12px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}>
            {feedback.message}
          </div>
        )}
        <p className="donation-section-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Choisir un montant
        </p>
        <div className="amount-buttons">
          {presetAmounts.map((a) => (
            <button key={a}
              className={`btn-amount ${selected === a ? 'selected' : ''}`}
              onClick={() => { setSelected(a); setCustom(''); }}>
              {a} $
            </button>
          ))}
        </div>

        <p className="donation-section-title" style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 10 }}>
          Inscrivez votre propre montant
        </p>
        <input className="donation-input" type="number" placeholder="500"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
          min="1" />

        <button
          className="btn-donate"
          onClick={() => amount > 0 && !submitting && setShowModal(true)}
          style={{ opacity: amount > 0 && !submitting ? 1 : 0.5 }}
        >
          <FaHandHoldingHeart size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {submitting ? 'Initialisation…' : 'Effectuer le don via Skipe'}
        </button>
      </div>
    </div>
  );
}

export default Donation;
