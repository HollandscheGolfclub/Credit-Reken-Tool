<?php defined('ABSPATH') || exit; ?>
<div class="hgc-calculator hgc-calculator--launcher" data-calculator-mode="launcher" data-design="clubhouse">
  <section class="design-picker" id="hgc-design-picker" aria-labelledby="hgc-design-title">
    <div class="design-picker__header">
      <img src="<?php echo esc_url(HGC_CALCULATOR_URL . 'assets/hgc-logo.png'); ?>" alt="Hollandsche Golfclub" />
      <p class="eyebrow">Kies de uitstraling</p>
      <h2 id="hgc-design-title">Wat vinden we het mooist?</h2>
      <p>Bekijk vijf verschillende richtingen. De inhoud en berekening blijven in iedere versie hetzelfde.</p>
    </div>
    <div class="design-options" role="list" aria-label="Beschikbare ontwerpen">
      <button class="design-option design-option--clubhouse" type="button" data-design-choice="clubhouse" role="listitem">
        <span class="design-preview" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="design-option__number">01</span><strong>Clubhuis</strong><small>Warm, vertrouwd en duidelijk HGC.</small>
      </button>
      <button class="design-option design-option--fairway" type="button" data-design-choice="fairway" role="listitem">
        <span class="design-preview" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="design-option__number">02</span><strong>Fairway</strong><small>Licht, ruim en vriendelijk afgerond.</small>
      </button>
      <button class="design-option design-option--scorecard" type="button" data-design-choice="scorecard" role="listitem">
        <span class="design-preview" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="design-option__number">03</span><strong>Scorekaart</strong><small>Redactioneel, rustig en stijlvol.</small>
      </button>
      <button class="design-option design-option--night" type="button" data-design-choice="night" role="listitem">
        <span class="design-preview" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="design-option__number">04</span><strong>Tour</strong><small>Donker, premium en krachtig.</small>
      </button>
      <button class="design-option design-option--energy" type="button" data-design-choice="energy" role="listitem">
        <span class="design-preview" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="design-option__number">05</span><strong>Energie</strong><small>Fris, opvallend en actiegericht.</small>
      </button>
    </div>
  </section>

  <section class="calculator-shell launcher-shell" id="hgc-calculator-start" aria-labelledby="hgc-launcher-title" hidden>
    <div class="launcher-hero">
      <div class="launcher-hero-copy">
        <p class="eyebrow">Persoonlijke keuzehulp</p>
        <h2 id="hgc-launcher-title">Vind het speelrecht dat écht bij je past</h2>
        <p>Persoonlijk advies op basis van waar, hoe vaak en wanneer jij golft.</p>
      </div>
      <div class="launcher-logo-card">
        <img src="<?php echo esc_url(HGC_CALCULATOR_URL . 'assets/hgc-logo.png'); ?>" alt="Hollandsche Golfclub" />
      </div>
    </div>

    <div class="launcher-body">
      <button class="launcher-design-back" type="button" data-back-to-designs><span aria-hidden="true">←</span> Ander ontwerp kiezen</button>
      <div class="launcher-heading">
        <span class="step-number">START</span>
        <div><h3>Wat wil je ontdekken?</h3><p>Kies één van de twee routes. Je krijgt direct een heldere, persoonlijke uitkomst.</p></div>
      </div>

      <div class="launcher-options">
        <button class="launcher-option" type="button" data-launch-mode="choice">
          <span class="launcher-option-icon" aria-hidden="true">01</span>
          <span class="launcher-option-copy">
            <span class="launcher-tag">Ik oriënteer mij</span>
            <strong>Welk speelrecht past bij mij?</strong>
            <small>Je speelt al of wilt gaan spelen en zoekt het pakket dat het beste bij jouw golfjaar past.</small>
            <span class="launcher-link">Start de keuzehulp <b aria-hidden="true">→</b></span>
          </span>
        </button>
        <button class="launcher-option launcher-option--comparison" type="button" data-launch-mode="comparison">
          <span class="launcher-option-icon" aria-hidden="true">€</span>
          <span class="launcher-option-copy">
            <span class="launcher-tag">Ik wil vergelijken</span>
            <strong>Kan ik voordeliger golfen?</strong>
            <small>Vergelijk je huidige golfkosten met een passend speelrecht van Hollandsche Golfclub.</small>
            <span class="launcher-link">Start de vergelijking <b aria-hidden="true">→</b></span>
          </span>
        </button>
      </div>

      <div class="launcher-assurance"><span aria-hidden="true">✓</span><p><strong>Binnen 2 minuten jouw uitkomst</strong>Gratis, vrijblijvend en zonder persoonsgegevens.</p></div>
    </div>
  </section>

  <div class="calculator-stage" data-mode-panel="choice" hidden>
    <button class="launcher-back" type="button" data-back-to-launcher><span aria-hidden="true">←</span> Andere berekening kiezen</button>
    <?php include HGC_CALCULATOR_DIR . 'templates/calculator.php'; ?>
  </div>
  <div class="calculator-stage" data-mode-panel="comparison" hidden>
    <button class="launcher-back" type="button" data-back-to-launcher><span aria-hidden="true">←</span> Andere berekening kiezen</button>
    <?php include HGC_CALCULATOR_DIR . 'templates/comparison.php'; ?>
  </div>
</div>
