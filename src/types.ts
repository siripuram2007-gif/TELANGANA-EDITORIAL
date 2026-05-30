export interface CoPilotOutput {
  websiteBrief: string;
  quickReadHighlights: string[];
  socialMediaX: string;
  socialMediaLinkedInInstagram: string;
  newsletterTeaserSubject: string;
  newsletterTeaserSentence1: string;
  newsletterTeaserSentence2: string;
  factualGroundings: {
    claim: string;
    sourceSentence: string;
  }[];
}

export interface HistoryItem {
  id: string;
  title: string;
  rawText: string;
  processedDate: string;
  category?: string;
  output: CoPilotOutput;
}
