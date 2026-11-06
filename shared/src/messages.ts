/** French messages shown to users, shared so web and API say the same thing. */
export const messages = {
  phone: {
    invalid: 'Numéro de téléphone marocain invalide.',
  },
  tenant: {
    businessNotFound: 'Cette adresse ne correspond à aucun établissement.',
    notFound: 'Page introuvable.',
    unavailable:
      'Le service est momentanément indisponible. Merci de réessayer dans quelques instants.',
  },
  auth: {
    unauthenticated: 'Veuillez vous connecter.',
    tokenExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
    invalidCredentials: 'Email ou mot de passe incorrect.',
  },
  subdomain: {
    invalid: 'Utilisez 3 à 30 lettres minuscules, chiffres ou tirets.',
    reserved: 'Cette adresse est réservée.',
    taken: 'Cette adresse est déjà prise.',
  },
  request: {
    tooManyRequests: 'Trop de tentatives. Réessayez dans quelques minutes.',
    badOrigin: 'Requête refusée. Rechargez la page puis réessayez.',
    forbidden: 'Action non autorisée.',
    conflict: 'Action impossible pour le moment.',
    internalError: 'Une erreur est survenue. Réessayez dans un instant.',
    validationFailed:
      'Certaines informations ne sont pas valides. Vérifiez le formulaire.',
    unavailable:
      'Le service ne répond pas pour le moment. Réessayez dans un instant.',
  },
} as const;
