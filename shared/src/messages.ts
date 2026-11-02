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
  },
} as const;
