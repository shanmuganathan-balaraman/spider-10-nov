/**
 * AI Modal Detector for Spider-10-Nov
 * Analyzes DOM to detect if a modal/popover is open and provides closing actions
 * Adapted from crawl-agent with browser-manager integration
 * Pure AI-driven detection - no hardcoded selectors or rules
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import * as browserManager from '../browser/browser-manager';
import { LLMFactory } from './llm-factory';

const logger = createLogger('ModalDetector');

// Maximum HTML length to send to AI for analysis (to avoid token limits)
const MAX_HTML_LENGTH_FOR_ANALYSIS = 40000;

/**
 * Modal detection result interface
 */
export interface ModalDetectionResult {
  isModalOpen: boolean;
  confidence: number;
  modalType?: string;
  modalPurpose?: string;
  modalContent?: string;
  closingAction?: {
    type: 'click' | 'keyboard' | 'wait';
    target?: string;
    key?: string;
    description: string;
  };
  reasoning: string;
}

/**
 * Create LLM for modal detection
 */
function createModalDetectorLLM(): ChatOpenAI {
  return LLMFactory.createModalDetectorLLM();
}

/**
 * Detect if a modal/popover is currently open and provide closing action
 */
export async function detectModal(
  html: string,
  url: string,
  context?: {
    triggerAction?: string;
    expectedModalType?: string;
  }
): Promise<ModalDetectionResult> {
  const llm = createModalDetectorLLM();

  const systemPrompt = `You are an expert at detecting modals, popovers, dialogs, and overlays in web pages.

Your task: Analyze the provided HTML to determine if a modal/popover/dialog is currently open.

DETECTION CRITERIA:
- Look for overlay elements with high z-index or position: fixed/absolute
- Check for elements with role="dialog", role="alertdialog", aria-modal="true"
- Look for common modal class names (modal, popup, popover, dialog, overlay, drawer)
- Identify backdrop/overlay elements that block interaction with main content
- Consider elements that appear to be floating above the main page content
- Look for elements with display:block that are typically hidden

MODAL TYPES:
- **modal**: Full-screen or centered dialog box with backdrop
- **popover**: Small contextual popup attached to an element
- **dialog**: Confirmation or alert dialog
- **overlay**: Full-screen overlay (e.g., loading, image viewer)
- **toast**: Non-blocking notification (usually not exploration-blocking)
- **other**: Other types of floating UI elements

CLOSING ACTION DETECTION:
If a modal is open, identify how to close it:
1. Look for close buttons (×, X, Close, Cancel, Dismiss)
2. Check for elements with aria-label="close", class="close", role="button" with close intent
3. Consider if clicking backdrop/overlay closes the modal
4. Check if Escape key is likely to work (aria-modal="true" often supports Escape)
5. Prioritize explicit close buttons over implicit methods

IMPORTANT: Be conservative in detection
- Only report modal as open if you're confident (>0.7) it's blocking exploration
- Toast notifications or subtle popovers that don't block interaction should have lower confidence
- Consider the context: was an action just performed that might trigger a modal?

Return JSON format:
{
  "isModalOpen": true/false,
  "confidence": 0.0-1.0,
  "modalType": "modal|popover|dialog|overlay|toast|other",
  "modalPurpose": "Brief description of what the modal is for",
  "modalContent": "Brief summary of modal content",
  "closingAction": {
    "type": "click|keyboard|wait",
    "target": "CSS selector for close element (if type is click)",
    "key": "Escape|Enter (if type is keyboard)",
    "description": "How to close this modal"
  },
  "reasoning": "Your reasoning for the detection and closing action"
}

If no modal is open, return:
{
  "isModalOpen": false,
  "confidence": 0.9,
  "reasoning": "No modal elements detected in the DOM"
}`;

  const contextInfo = context ? `
**Context:**
- Trigger Action: ${context.triggerAction || 'Unknown'}
- Expected Modal Type: ${context.expectedModalType || 'Any'}
` : '';

  const userPrompt = `Analyze this page to detect if a modal/popover is open:

**Page URL:** ${url}

**HTML Content:**
${html.substring(0, MAX_HTML_LENGTH_FOR_ANALYSIS)}${html.length > MAX_HTML_LENGTH_FOR_ANALYSIS ? '...[truncated]' : ''}

${contextInfo}

Is there a modal, popover, or dialog currently open? If yes, how should we close it?`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    const content = response.content as string;
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result: ModalDetectionResult = JSON.parse(jsonContent);
    logger.info('Modal detection result:', result.isModalOpen, result.confidence);
    return result;

  } catch (error) {
    logger.error('Failed to detect modal:', error);
    // Return safe fallback - assume no modal
    return {
      isModalOpen: false,
      confidence: 0.5,
      reasoning: 'AI detection failed - assuming no modal'
    };
  }
}

/**
 * Execute modal closing action using browser manager
 */
export async function closeModal(
  modalResult: ModalDetectionResult,
  pageId: string = 'default'
): Promise<boolean> {
  if (!modalResult.closingAction) {
    logger.warn('No closing action provided');
    return false;
  }

  const { closingAction } = modalResult;
  logger.info(`Attempting to close modal: ${closingAction.description}`);

  try {
    switch (closingAction.type) {
      case 'click': {
        if (!closingAction.target) {
          throw new Error('Close action requires target selector');
        }
        
        // Try to click the close element using browser manager
        const result = await browserManager.clickElement(closingAction.target, pageId);
        if (result.status === 'success') {
          logger.info('Clicked close element');
          // Wait for modal to close
          await new Promise(resolve => setTimeout(resolve, 500));
          return true;
        } else {
          logger.warn(`Failed to click close element: ${result.message}`);
        }
        break;
      }

      case 'keyboard': {
        if (!closingAction.key) {
          throw new Error('Keyboard action requires key');
        }
        
        // Get page and send keyboard press
        const page = browserManager.getPage(pageId);
        if (page) {
          await page.keyboard.press(closingAction.key);
          logger.info(`Pressed ${closingAction.key} key`);
          // Wait for modal to close
          await new Promise(resolve => setTimeout(resolve, 500));
          return true;
        }
        break;
      }

      case 'wait': {
        // For auto-closing modals (e.g., toasts)
        await new Promise(resolve => setTimeout(resolve, 2000));
        logger.info('Waited for modal to auto-close');
        return true;
      }

      default:
        logger.warn(`Unknown closing action type: ${closingAction.type}`);
        return false;
    }

    return false;
  } catch (error) {
    logger.error('Failed to close modal:', error);
    return false;
  }
}

/**
 * Detect modal on current page using browser manager
 */
export async function detectModalOnCurrentPage(
  pageId: string = 'default',
  context?: {
    triggerAction?: string;
    expectedModalType?: string;
  }
): Promise<ModalDetectionResult> {
  try {
    const html = await browserManager.getPageDOM(pageId);
    const url = browserManager.getCurrentPageUrl(pageId);
    
    return await detectModal(html, url, context);
  } catch (error) {
    logger.error('Failed to detect modal on current page:', error);
    return {
      isModalOpen: false,
      confidence: 0.5,
      reasoning: 'Failed to extract page data for modal detection'
    };
  }
}

/**
 * Handle modal if present - detect and close
 */
export async function handleModalIfPresent(
  pageId: string = 'default',
  context?: {
    triggerAction?: string;
    expectedModalType?: string;
  }
): Promise<boolean> {
  logger.info('Checking for modal presence...');
  
  const modalResult = await detectModalOnCurrentPage(pageId, context);
  
  if (modalResult.isModalOpen && modalResult.confidence > 0.7) {
    logger.info('Modal detected, attempting to close...');
    const closed = await closeModal(modalResult, pageId);
    if (closed) {
      logger.info('Modal closed successfully');
    } else {
      logger.warn('Failed to close modal');
    }
    return closed;
  } else {
    logger.info('No modal detected or low confidence');
    return false;
  }
}