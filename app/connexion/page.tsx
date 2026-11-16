'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Form, Button, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';
import { ROLE_HOME, SERVICE_HOME } from '@/lib/permissions';

export default function ConnexionPage() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'warning' | 'danger' | 'info'>('info');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();

  const handleConnexion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsLocked(false);
    setRemainingAttempts(null);

    try {
      const res = await axios.post('/api/login', {
        email: email,
        password: motDePasse,
      }, { withCredentials: true });

      if (!res.data || !res.data.user) {
        setMessage('Identifiant ou mot de passe incorrect');
        setMessageType('danger');
        setLoading(false);
        return;
      }

      const profil = res.data.user;

      if (profil) {
        localStorage.setItem('profil', JSON.stringify(profil));
        const nomComplet = `${profil.nom || ''} ${profil.prenom || ''}`.trim();
        localStorage.setItem('nom_utilisateur', nomComplet);

        setMessage('✅ Connexion réussie ! Redirection...');
        setMessageType('success');

        setTimeout(() => {
          const home = ROLE_HOME[profil?.type];
          if (home) {
            router.push(home);
          } else {
            const firstService = profil?.permissions?.services?.[0];
            router.push((firstService && SERVICE_HOME[firstService]) || '/dashboard');
          }
        }, 1000);
      } else {
        setMessage('Erreur lors de la récupération du profil');
        setMessageType('danger');
      }
    } catch (error: any) {
      if (error.response?.status === 423) {
        setIsLocked(true);
        setMessage(error.response.data?.message || "Compte bloqué. Contactez l'administrateur.");
        setMessageType('danger');
      } else if (error.response?.status === 401) {
        const responseData = error.response.data;
        if (responseData?.remainingAttempts !== undefined) {
          setRemainingAttempts(responseData.remainingAttempts);
          setMessage(responseData.message || 'Identifiant ou mot de passe incorrect');
          setMessageType('warning');
        } else {
          setMessage('Identifiant ou mot de passe incorrect');
          setMessageType('danger');
        }
      } else if (error.response?.status === 400) {
        setMessage(error.response?.data?.message || 'Identifiant et mot de passe requis');
        setMessageType('danger');
      } else {
        console.error(error);
        setMessage('Erreur de connexion');
        setMessageType('danger');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 d-flex justify-content-center align-items-center login-background">
      <Row className="w-100">
        <Col md={{ span: 6, offset: 3 }} lg={{ span: 4, offset: 4 }}>
          <Card className="p-4 shadow-lg border-0 login-card">
            <Card.Body>
              <div className="text-center mb-2">
                <span className="login-logo-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/novasys-logo.jpg" alt="NOVASYS" style={{ maxWidth: 170, maxHeight: 90, objectFit: "contain" }} />
                </span>
              </div>
              <p className="text-center text-muted mb-4" style={{ letterSpacing: "0.06em" }}>
                <small>WE SECURE YOUR BUSINESS</small><br />Gestion commerciale — Connexion
              </p>

              {message && (
                <div className={`alert alert-${messageType} d-flex align-items-center mb-4`}>
                  {messageType === 'success' && <i className="bi bi-check-circle-fill me-2"></i>}
                  {messageType === 'warning' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                  {messageType === 'danger' && <i className="bi bi-x-circle-fill me-2"></i>}
                  {messageType === 'info' && <i className="bi bi-info-circle-fill me-2"></i>}
                  <div>
                    {message}
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <div className="small mt-1">
                        <strong>Tentatives restantes: {remainingAttempts}/4</strong>
                      </div>
                    )}
                    {remainingAttempts !== null && remainingAttempts === 0 && (
                      <div className="small mt-1">
                        <strong>Plus de tentatives disponibles</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isLocked && (
                <div className="alert alert-danger d-flex align-items-center mb-4">
                  <i className="bi bi-lock-fill me-2"></i>
                  <div>
                    <strong>Compte bloqué</strong>
                    <div className="small">
                      Votre compte est temporairement bloqué. Veuillez contacter un administrateur pour le débloquer.
                    </div>
                  </div>
                </div>
              )}

              <Form onSubmit={handleConnexion}>
                <Form.Group className="mb-3">
                  <Form.Label>Identifiant (email)</Form.Label>
                  <Form.Control
                    aria-label="Email" type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Mot de passe</Form.Label>
                  <Form.Control
                    aria-label="Mot de passe" type="password"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100" disabled={loading || isLocked}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Connexion...
                    </>
                  ) : isLocked ? (
                    <>
                      <i className="bi bi-lock-fill me-2"></i>
                      Compte bloqué
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
                <Button variant="secondary" className="w-100 mt-3" onClick={() => router.push('/')}>
                  Retour
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
