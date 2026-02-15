/**
 * Build a tracking URL for a given carrier and tracking number.
 * Falls back to a Google search URL for unknown carriers.
 */

const CARRIER_PATTERNS: Record<string, string> = {
  ups: "https://www.ups.com/track?tracknum={tracking_number}",
  fedex: "https://www.fedex.com/apps/fedextrack/?tracknumbers={tracking_number}",
  usps: "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={tracking_number}",
  dhl: "https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}",
  postnl: "https://postnl.nl/tracktrace/?B={tracking_number}",
  dpd: "https://tracking.dpd.de/status/en_US/parcel/{tracking_number}",
  gls: "https://gls-group.eu/track/{tracking_number}",
  hermes: "https://www.evri.com/track/parcel/{tracking_number}",
  evri: "https://www.evri.com/track/parcel/{tracking_number}",
  budbee: "https://budbee.com/track/{tracking_number}",
  bpost: "https://track.bpost.cloud/btr/web/#/search?itemCode={tracking_number}",
  colissimo: "https://www.colissimo.fr/portail_colissimo/suivreResultat.do?parcelnumber={tracking_number}",
  "deutsche post": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={tracking_number}",
  correos: "https://www.correos.es/es/en/tools/track/result?tracking-number={tracking_number}",
  tnt: "https://www.tnt.com/express/en_us/site/tracking.html?searchType=con&cons={tracking_number}",
  "royal mail": "https://www.royalmail.com/track-your-item?trackNumber={tracking_number}",
  "canada post": "https://www.canadapost-postescanada.ca/track-reperage/en#{tracking_number}",
  australia_post: "https://auspost.com.au/mypost/track/#/details/{tracking_number}",
  chronopost: "https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={tracking_number}",
  mondialrelay: "https://www.mondialrelay.fr/suivi-de-colis/?NumColis={tracking_number}",
};

export function buildTrackingUrl(
  carrier: string | null,
  trackingNumber: string
): string | null {
  if (!carrier || !trackingNumber) return null;

  const normalizedCarrier = carrier.toLowerCase().trim();
  const pattern = CARRIER_PATTERNS[normalizedCarrier];

  if (!pattern) {
    // Fallback: Google search
    return `https://www.google.com/search?q=${encodeURIComponent(
      trackingNumber + " tracking"
    )}`;
  }

  return pattern.replace(
    "{tracking_number}",
    encodeURIComponent(trackingNumber)
  );
}
