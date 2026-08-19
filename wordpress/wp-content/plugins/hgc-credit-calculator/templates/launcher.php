<?php defined('ABSPATH') || exit; ?>
<div class="hgc-calculator hgc-calculator--launcher" data-calculator-mode="launcher" data-design="clubhouse">
  <section class="design-picker" id="hgc-design-picker" aria-labelledby="hgc-design-title">
    <div class="design-picker__header">
      <img src="<?php echo esc_url(HGC_CALCULATOR_URL . 'assets/hgc-logo.png'); ?>" alt="Hollandsche Golfclub" />
      <p class="eyebrow">Kies de uitstraling</p>
      <h2 id="hgc-design-title">Welke versie past het best bij jullie website?</h2>
      <p>Kies een ontwerp en bekijk direct de keuzehulp “Welk speelrecht past bij mij?” in die stijl.</p>
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

  <div class="calculator-stage" data-mode-panel="choice" hidden>
    <button class="launcher-back" type="button" data-back-to-designs><span aria-hidden="true">←</span> Ander ontwerp kiezen</button>
    <?php include HGC_CALCULATOR_DIR . 'templates/calculator.php'; ?>
  </div>
</div>
