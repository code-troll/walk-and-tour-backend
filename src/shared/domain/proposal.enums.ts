export const PROPOSAL_ACCEPTANCE_STATUSES = ['pending', 'accepted', 'expired'] as const;
export type ProposalAcceptanceStatus = (typeof PROPOSAL_ACCEPTANCE_STATUSES)[number];

export const PROPOSAL_PUBLICATION_STATUSES = ['published', 'unpublished'] as const;
export type ProposalPublicationStatus = (typeof PROPOSAL_PUBLICATION_STATUSES)[number];
