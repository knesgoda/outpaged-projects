describe('Board filter experience', () => {
  beforeEach(() => {
    cy.visit('/kanban');
  });

  it('renders quick filter chips and toggles active state', () => {
    cy.contains('button', 'Assigned to me').as('meChip');
    cy.get('@meChip').should('have.attr', 'aria-pressed', 'false');
    cy.get('@meChip').click();
    cy.get('@meChip').should('have.attr', 'aria-pressed', 'true');
    cy.get('@meChip').click();
    cy.get('@meChip').should('have.attr', 'aria-pressed', 'false');
  });

  it('shows sharing controls gated by permissions', () => {
    cy.contains('Share filters');
    cy.contains('Visibility');
    cy.contains('Only you can see these filters.');
  });
});
