import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pricing-page.html',
  styleUrl: './pricing-page.scss',
})
export class PricingPage {
  isYearly = false;
  currentPlanNameKey = 'PRICING.PLANS.PRO.NAME';

  plans = [
    {
      nameKey: 'PRICING.PLANS.FREE.NAME',
      descKey: 'PRICING.PLANS.FREE.DESC',
      priceMonthly: 0,
      priceYearly: 0,
      perKey: 'PRICING.PLANS.FREE.PER',
      ctaKey: 'PRICING.PLANS.FREE.CTA',
      features: [
        { textKey: 'PRICING.FEATURES.FREE.0', disabled: false },
        { textKey: 'PRICING.FEATURES.FREE.1', disabled: false },
        { textKey: 'PRICING.FEATURES.FREE.2', disabled: false },
        { textKey: 'PRICING.FEATURES.FREE_DISABLED.0', disabled: true },
      ],
      featured: false,
      popularKey: '',
      buttonClass: 'btn-outline',
    },
    {
      nameKey: 'PRICING.PLANS.PRO.NAME',
      descKey: 'PRICING.PLANS.PRO.DESC',
      priceMonthly: 30,
      priceYearly: 24,
      perKey: 'PRICING.PLANS.PRO.PER',
      ctaKey: 'PRICING.PLANS.PRO.CTA',
      features: [
        { textKey: 'PRICING.FEATURES.PRO.0', disabled: false },
        { textKey: 'PRICING.FEATURES.PRO.1', disabled: false },
        { textKey: 'PRICING.FEATURES.PRO.2', disabled: false },
        { textKey: 'PRICING.FEATURES.PRO.3', disabled: false },
        { textKey: 'PRICING.FEATURES.PRO.4', disabled: false },
        { textKey: 'PRICING.FEATURES.PRO.5', disabled: false },
      ],
      featured: true,
      popularKey: 'PRICING.PLANS.PRO.POPULAR',
      buttonClass: 'btn-gradient',
    },
    {
      nameKey: 'PRICING.PLANS.MAX.NAME',
      descKey: 'PRICING.PLANS.MAX.DESC',
      priceMonthly: 120,
      priceYearly: 99,
      perKey: 'PRICING.PLANS.MAX.PER',
      ctaKey: 'PRICING.PLANS.MAX.CTA',
      features: [
        { textKey: 'PRICING.FEATURES.STUDIO.0', disabled: false },
        { textKey: 'PRICING.FEATURES.STUDIO.1', disabled: false },
        { textKey: 'PRICING.FEATURES.STUDIO.2', disabled: false },
        { textKey: 'PRICING.FEATURES.STUDIO.3', disabled: false },
      ],
      featured: false,
      popularKey: '',
      buttonClass: 'btn-outline',
    },
  ];

  faqs = [
    { questionKey: 'PRICING.FAQ.Q1', answerKey: 'PRICING.FAQ.A1', open: false },
    { questionKey: 'PRICING.FAQ.Q2', answerKey: 'PRICING.FAQ.A2', open: true },
    { questionKey: 'PRICING.FAQ.Q3', answerKey: 'PRICING.FAQ.A3', open: false },
    { questionKey: 'PRICING.FAQ.Q4', answerKey: 'PRICING.FAQ.A4', open: false },
  ];

  setBilling(yearly: boolean): void {
    this.isYearly = yearly;
  }

  toggleFaq(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

  selectPlan(nameKey: string): void {
    this.currentPlanNameKey = nameKey;
  }
}

