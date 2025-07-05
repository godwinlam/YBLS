export interface Country {
  name: string;
  code: string;
  phoneCode?: string;
  currency?: string;
}

export const countriesList: Country[] = [
  { name: "United States", code: "US" },
  { name: "United Kingdom", code: "GB" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Germany", code: "DE" },
  { name: "France", code: "FR" },
  { name: "Japan", code: "JP" },
  { name: "China", code: "CN" },
  { name: "India", code: "IN" },
  { name: "Brazil", code: "BR" },
  { name: "Russia", code: "RU" },
  { name: "Italy", code: "IT" },
  { name: "Spain", code: "ES" },
  { name: "Mexico", code: "MX" },
  { name: "South Korea", code: "KR" },
  { name: "Netherlands", code: "NL" },
  { name: "Sweden", code: "SE" },
  { name: "Switzerland", code: "CH" },
  { name: "Norway", code: "NO" },
  { name: "Denmark", code: "DK" },
  { name: "Finland", code: "FI" },
  { name: "Belgium", code: "BE" },
  { name: "Austria", code: "AT" },
  { name: "New Zealand", code: "NZ" },
  { name: "Singapore", code: "SG" },
  { name: "Malaysia", code: "MY" },
  { name: "Indonesia", code: "ID" },
  { name: "Thailand", code: "TH" },
  { name: "Philippines", code: "PH" },
  { name: "Vietnam", code: "VN" },
  { name: "South Africa", code: "ZA" },
  { name: "Nigeria", code: "NG" },
  { name: "Egypt", code: "EG" },
  { name: "Turkey", code: "TR" },
  { name: "Saudi Arabia", code: "SA" },
  { name: "United Arab Emirates", code: "AE" },
  { name: "Israel", code: "IL" },
  { name: "Argentina", code: "AR" },
  { name: "Chile", code: "CL" },
  { name: "Colombia", code: "CO" },
  { name: "Peru", code: "PE" },
  { name: "Portugal", code: "PT" },
  { name: "Greece", code: "GR" },
  { name: "Poland", code: "PL" },
  { name: "Czech Republic", code: "CZ" },
  { name: "Hungary", code: "HU" },
  { name: "Romania", code: "RO" },
  { name: "Ukraine", code: "UA" },
  { name: "Ireland", code: "IE" },
  { name: "Iceland", code: "IS" },
];

export const countries: Record<string, Country> = countriesList.reduce(
  (acc, country) => {
    acc[country.code] = country;
    return acc;
  },
  {} as Record<string, Country>
);
