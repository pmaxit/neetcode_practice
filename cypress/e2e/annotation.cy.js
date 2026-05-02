describe('Annotation Draw-Save-View Flow', () => {
    const apiBase = Cypress.env('API_BASE') || 'http://localhost:3001';

    beforeEach(() => {
        cy.clearLocalStorage();
        cy.visit('/');
    });

    it('draws, saves, and views an annotation on a practice problem', () => {
        // Log in via API to get a valid token and session
        cy.request({
            method: 'POST',
            url: `${apiBase}/api/auth/login`,
            body: { email: 'test@example.com', password: 'password123' },
            failOnStatusCode: false
        }).then((loginRes) => {
            let token, sessionId;
            if (loginRes.status === 200 && loginRes.body.token) {
                token = loginRes.body.token;
            } else {
                // Register if login fails
                cy.request({
                    method: 'POST',
                    url: `${apiBase}/api/auth/register`,
                    body: { email: 'test@example.com', password: 'password123' }
                }).then((regRes) => {
                    token = regRes.body.token;
                });
            }

            cy.wrap(null).then(() => {
                expect(token).to.exist;
                cy.request({
                    method: 'GET',
                    url: `${apiBase}/api/sessions`,
                    headers: { Authorization: `Bearer ${token}` }
                }).then((sessRes) => {
                    const sessions = sessRes.body;
                    if (sessions.length > 0) {
                        sessionId = sessions[0].id;
                    } else {
                        cy.request({
                            method: 'POST',
                            url: `${apiBase}/api/sessions`,
                            headers: { Authorization: `Bearer ${token}` },
                            body: { name: 'Test Session' }
                        }).then((createRes) => {
                            sessionId = createRes.body.id;
                        });
                    }

                    cy.wrap(null).then(() => {
                        expect(sessionId).to.exist;
                        // Seed localStorage to bypass auth UI
                        cy.window().then((win) => {
                            win.localStorage.setItem('jwt', token);
                            win.localStorage.setItem('activeSession', JSON.stringify({ id: sessionId, name: 'Test Session' }));
                        });
                        cy.visit('/');
                    });
                });
            });
        });

        // Wait for the app to load and select a problem
        cy.contains('Mark as Done', { timeout: 15000 }).should('be.visible');

        // Click Annotate to open overlay
        cy.contains('button', 'Annotate').click();

        // The overlay should appear
        cy.get('.annotation-overlay').should('be.visible');
        cy.get('canvas').should('be.visible');

        // Simulate drawing on canvas
        cy.get('canvas')
            .trigger('mousedown', { clientX: 200, clientY: 200 })
            .trigger('mousemove', { clientX: 250, clientY: 250 })
            .trigger('mouseup');

        // Click Save
        cy.contains('button', 'Save').click();
        cy.contains('Annotation saved!', { timeout: 5000 }).should('be.visible');

        // Close overlay
        cy.get('.annotation-overlay button[title="Close"]').click();
        cy.get('.annotation-overlay').should('not.exist');

        // Verify View Annotation button appears
        cy.contains('button', 'View Annotation', { timeout: 5000 }).should('be.visible');

        // Click View Annotation to open modal
        cy.contains('button', 'View Annotation').click();
        cy.get('img[alt="Annotation"]').should('be.visible');

        // Close modal
        cy.get('.modal-overlay button').contains('', { matchCase: false }).first().click();
        cy.get('img[alt="Annotation"]').should('not.exist');
    });
});
