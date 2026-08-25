<?php defined('ABSPATH') || exit; ?>
<div class="hgc-calculator" data-calculator-mode="choice" data-design="clubhouse">
  <section class="calculator-shell" id="calculator" aria-labelledby="calculator-title">
    <div class="calculator-topbar">
      <div>
        <p class="eyebrow">HGC-keuzehulp</p>
        <h2 id="calculator-title">Het best passende speelrecht</h2>
        <p class="calculator-topbar-intro">Twee stappen, ongeveer een minuut. Je krijgt een advies met wat je vooraf betaalt en wat je per ronde overhoudt.</p>
      </div>
      <div class="calculator-topbar-meta">
        <img class="calculator-brand-logo" src="<?php echo esc_url(HGC_CALCULATOR_URL . 'assets/hgc-logo.png'); ?>" alt="Hollandsche Golfclub" />
        <p class="step-label" aria-live="polite">Stap <strong id="current-step">1</strong> van 2</p>
      </div>
    </div>

    <div class="progress" aria-hidden="true">
      <span class="progress-bar" id="progress-bar"></span>
    </div>

    <form id="calculator-form" novalidate>
      <section class="form-step is-active" data-step="1">
        <div class="step-heading">
          <span class="step-number">01</span>
          <div>
            <h3>Hoe ziet je golfjaar eruit?</h3>
            <p>Vul per baantype in hoeveel rondes van 9 holes je speelt in 12 maanden.</p>
          </div>
        </div>

        <div class="round-plan-grid">
          <article class="round-plan-card">
            <div class="round-plan-title"><span class="choice-icon">9</span><div><h4>Grote baan</h4><p>Par 3/4/5-baan</p></div></div>
            <div class="field-group">
              <div class="field-label-row">
                <label for="large-rounds-number">Hoeveel rondes van 9 holes per 12 maanden?</label>
                <div class="number-suffix"><input id="large-rounds-number" type="number" min="0" max="400" value="20" inputmode="numeric" /><span>rondes</span></div>
              </div>
              <input id="large-rounds" class="range" type="range" min="0" max="400" value="20" />
              <div class="range-scale"><span>0</span><span>200</span><span>400</span></div>
            </div>
            <div class="field-group field-group--last">
              <label id="large-course-label" for="large-course">Op welke grote baan speel je meestal?</label>
              <select id="large-course" aria-labelledby="large-course-label" required></select>
              <p class="field-help" id="large-course-help">De baan bepaalt hoeveel credits een ronde kost.</p>
            </div>
          </article>

          <article class="round-plan-card">
            <div class="round-plan-title"><span class="choice-icon choice-icon--flag">⚑</span><div><h4>Kleine baan</h4><p>Shortgolfbaan / Par 3-baan</p></div></div>
            <div class="field-group">
              <div class="field-label-row">
                <label for="small-rounds-number">Hoeveel rondes per 12 maanden?</label>
                <div class="number-suffix"><input id="small-rounds-number" type="number" min="0" max="400" value="10" inputmode="numeric" /><span>rondes</span></div>
              </div>
              <input id="small-rounds" class="range" type="range" min="0" max="400" value="10" />
              <div class="range-scale"><span>0</span><span>200</span><span>400</span></div>
            </div>
            <div class="field-group field-group--last">
              <label id="small-course-label" for="small-course">Op welke kleine baan speel je meestal?</label>
              <select id="small-course" aria-labelledby="small-course-label" required></select>
              <p class="field-help" id="small-course-help">Voor Shortgolf gelden andere creditwaarden.</p>
            </div>
          </article>
        </div>

        <div class="field-row field-row--settings">
          <div class="field-group">
            <label for="age-category">Voor wie bereken je dit?</label>
            <select id="age-category">
              <option value="adult">Volwassene</option>
              <option value="youth">Jeugd t/m 17 jaar</option>
            </select>
          </div>
          <label class="toggle-row toggle-row--inline">
            <input id="off-peak" type="checkbox" />
            <span class="toggle" aria-hidden="true"></span>
            <span><strong>Ik speel vooral in de daluren</strong><small>We nemen het dalurenspeelrecht mee als dat past.</small></span>
          </label>
        </div>

        <div class="form-error" id="rounds-error" role="alert" hidden>Vul bij de grote of kleine baan minimaal 1 ronde in.</div>

        <div class="form-actions">
          <p class="form-actions-hint">Je hoeft niets exact te weten — een schatting is genoeg. In stap 2 kun je alles nog bijstellen.</p>
          <button class="button button--primary" type="submit">Ontdek mijn beste speelrecht <span>→</span></button>
        </div>
      </section>

      <section class="form-step result-step" data-step="2" hidden aria-live="polite">
        <div id="result-content"></div>
        <div class="form-actions form-actions--result">
          <button class="button button--text" type="button" data-back>← Keuzes aanpassen</button>
          <button class="button button--ghost" type="button" id="restart">Opnieuw beginnen</button>
        </div>
      </section>
    </form>
  </section>
</div>
