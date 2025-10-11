describe("View schema controls", () => {
  it("allows toggling column visibility per view", () => {
    cy.visit("/__dev__/view-schema");

    cy.get("[data-cy=visible-columns]").should(
      "contain.text",
      "title, status, assignee, due_date"
    );

    cy.contains("status")
      .closest("div")
      .find('[role="switch"]')
      .click();

    cy.get("[data-cy=visible-columns]").should(
      "not.contain.text",
      "status"
    );

    cy.contains("Save preferences").click();

    cy.get("[data-cy=hidden-columns]").should("contain.text", "status");

    cy.contains("Reset").click();

    cy.get("[data-cy=visible-columns]").should(
      "contain.text",
      "title, status, assignee, due_date"
    );
    cy.get("[data-cy=hidden-columns]").should("contain.text", "none");
  });
});
