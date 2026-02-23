import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FormField } from './FormField';
import { BattleResults } from './BattleResults';
import { HelpTooltip } from './HelpTooltip';
import { Calculator, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  parseScoutPaste,
  parseStatBonusesOnly,
  parseNotesTwoColumn,
  parseTierString,
  buildSideFromScout,
  buildEnemyFromManual,
  recommendFormation,
  sumTroops,
  BATTLE_TYPES,
  type RecommendResult,
} from '../lib/kingshotCore';
import {
  validateScoutPaste,
  validateTier,
  validateTG,
  validateMarchSize,
  validateManualTroopComposition,
  validateTargetWin,
  parseIntLoose,
  type ValidationResult,
} from '../utils/validation';
import { HELP_TEXT } from '../constants/helpText';
import { extractScoutFromImage } from '../utils/ocrExtraction';

interface FormErrors {
  scoutPaste?: string;
  myTier?: string;
  myTG?: string;
  enemyTier?: string;
  enemyTG?: string;
  marchSize?: string;
  manualInfantry?: string;
  manualCavalry?: string;
  manualArcher?: string;
  targetWinPercentage?: string;
  enemyComposition?: string;
  enemyTotal?: string;
  enemyStatBonuses?: string;
}

export function BattleCalculatorForm() {
  // Scout paste state
  const [scoutPaste, setScoutPaste] = useState('');
  const [myScoutPaste, setMyScoutPaste] = useState('');

  // Manual enemy entry state
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [enemyTotal, setEnemyTotal] = useState('');
  const [enemyInfPct, setEnemyInfPct] = useState('50');
  const [enemyCavPct, setEnemyCavPct] = useState('20');
  const [enemyStatBonuses, setEnemyStatBonuses] = useState('');

  // Tier and TG state
  const [myTier, setMyTier] = useState('10');
  const [myTG, setMyTG] = useState('5');
  const [enemyTier, setEnemyTier] = useState('10');
  const [enemyTG, setEnemyTG] = useState('5');

  // Special bonuses state
  const [specialBonuses, setSpecialBonuses] = useState('');

  // Battle configuration state
  const [battleTypeId, setBattleTypeId] = useState('1');
  const [marchSize, setMarchSize] = useState('');
  const [targetWinPercentage, setTargetWinPercentage] = useState('');

  // Results and UI state
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // OCR loading states
  const [isOcrProcessingEnemy, setIsOcrProcessingEnemy] = useState(false);
  const [isOcrProcessingMy, setIsOcrProcessingMy] = useState(false);

  // Debug state for OCR tuning
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Enemy image upload handler with OCR
  const handleEnemyImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setIsOcrProcessingEnemy(true);
    try {
      const res = await extractScoutFromImage(file);

      // Auto-populate scout paste textarea
      setScoutPaste(res.fullText);

      // Auto-fill march size if detected
      if (res.marchSize != null) {
        setMarchSize(res.marchSize.toString());
      } else if (!marchSize) {
        // Infer from troop totals if no march size found
        const total =
          (res.counts.infantry ?? 0) + (res.counts.cavalry ?? 0) + (res.counts.archer ?? 0);
        if (total > 0) setMarchSize(total.toString());
      }

      // Auto-populate tier if detected
      if (res.inferred.tier != null) {
        setEnemyTier(res.inferred.tier.toString());
      }

      // Auto-populate TG level if detected
      if (res.inferred.tgLevel != null) {
        setEnemyTG(res.inferred.tgLevel.toString());
      }

      // Store debug info
      setDebugInfo(res.debug);

      toast.success('Enemy scout data extracted successfully!');
    } catch (error) {
      console.error('OCR error:', error);
      toast.error(error instanceof Error ? error.message : 'Could not extract scout data. Please ensure the image shows a clear Kingshot scout report with visible troop icons.');
    } finally {
      setIsOcrProcessingEnemy(false);
      event.target.value = ''; // Allow re-upload of same file
    }
  }, [marchSize]);

  // My troops image upload handler with OCR
  const handleMyImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setIsOcrProcessingMy(true);
    try {
      const res = await extractScoutFromImage(file);

      // Auto-populate scout paste textarea
      setMyScoutPaste(res.fullText);

      // Auto-fill march size from troop totals
      const total = (res.counts.infantry ?? 0) + (res.counts.cavalry ?? 0) + (res.counts.archer ?? 0);
      if (total > 0) {
        setMarchSize(total.toString());
      } else if (res.marchSize != null) {
        setMarchSize(res.marchSize.toString());
      }

      // Auto-populate tier if detected
      if (res.inferred.tier != null) {
        setMyTier(res.inferred.tier.toString());
      }

      // Auto-populate TG level if detected
      if (res.inferred.tgLevel != null) {
        setMyTG(res.inferred.tgLevel.toString());
      }

      // Store debug info
      setDebugInfo(res.debug);

      toast.success('Your scout data extracted successfully!');
    } catch (error) {
      console.error('OCR error:', error);
      toast.error(error instanceof Error ? error.message : 'Could not extract scout data. Please ensure the image shows a clear Kingshot scout report with visible troop icons.');
    } finally {
      setIsOcrProcessingMy(false);
      event.target.value = ''; // Allow re-upload of same file
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate enemy troops
    if (!useManualEntry) {
      const scoutError = validateScoutPaste(scoutPaste);
      if (!scoutError.valid) newErrors.scoutPaste = scoutError.error;
    } else {
      const totalValidation = validateMarchSize(parseIntLoose(enemyTotal));
      if (!totalValidation.valid) newErrors.enemyTotal = totalValidation.error;

      const compositionValidation = validateManualTroopComposition(
        parseFloat(enemyInfPct),
        parseFloat(enemyCavPct)
      );
      if (!compositionValidation.valid) newErrors.enemyComposition = compositionValidation.error;

      if (!enemyStatBonuses.trim()) {
        newErrors.enemyStatBonuses = 'Stat bonuses are required in manual mode';
      }
    }

    // Validate tiers and TGs
    const myTierError = validateTier(parseInt(myTier));
    if (!myTierError.valid) newErrors.myTier = myTierError.error;

    const myTGError = validateTG(parseInt(myTG));
    if (!myTGError.valid) newErrors.myTG = myTGError.error;

    const enemyTierError = validateTier(parseInt(enemyTier));
    if (!enemyTierError.valid) newErrors.enemyTier = enemyTierError.error;

    const enemyTGError = validateTG(parseInt(enemyTG));
    if (!enemyTGError.valid) newErrors.enemyTG = enemyTGError.error;

    // Validate march size
    const marchSizeNum = parseIntLoose(marchSize);
    const marchError = validateMarchSize(marchSizeNum);
    if (!marchError.valid) newErrors.marchSize = marchError.error;

    // Validate target win percentage if provided
    if (targetWinPercentage) {
      const targetError = validateTargetWin(parseFloat(targetWinPercentage));
      if (!targetError.valid) newErrors.targetWinPercentage = targetError.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    scoutPaste,
    useManualEntry,
    enemyTotal,
    enemyInfPct,
    enemyCavPct,
    enemyStatBonuses,
    myTier,
    myTG,
    enemyTier,
    enemyTG,
    marchSize,
    targetWinPercentage,
  ]);

  const handleCalculate = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before calculating');
      return;
    }

    setIsCalculating(true);
    setResult(null);

    try {
      // Parse special bonuses
      const specialParsed = parseNotesTwoColumn(specialBonuses);

      // Build my side
      const mySide = buildSideFromScout({
        scoutText: myScoutPaste || '',
        tierText: `T${myTier} TG${myTG}`,
        special: specialParsed.me,
      });

      // Build enemy side
      const enemySide = useManualEntry
        ? buildEnemyFromManual({
            statBonusesText: enemyStatBonuses,
            manual: {
              total: parseIntLoose(enemyTotal),
              infPct: parseFloat(enemyInfPct),
              cavPct: parseFloat(enemyCavPct),
            },
            tierText: `T${enemyTier} TG${enemyTG}`,
            special: specialParsed.enemy,
          })
        : buildSideFromScout({
            scoutText: scoutPaste,
            tierText: `T${enemyTier} TG${enemyTG}`,
            special: specialParsed.enemy,
          });

      // Determine march size: scout-derived if available, otherwise manual input
      let finalMarchSize: number;
      if (myScoutPaste.trim()) {
        const parsedMy = parseScoutPaste(myScoutPaste);
        const troopSum = sumTroops(parsedMy.troops);
        if (troopSum > 0) {
          finalMarchSize = troopSum;
        } else {
          finalMarchSize = parseIntLoose(marchSize);
        }
      } else {
        finalMarchSize = parseIntLoose(marchSize);
      }

      // Calculate
      const recommendation = recommendFormation({
        my: mySide,
        enemy: enemySide,
        battleTypeId: parseInt(battleTypeId),
        marchSize: finalMarchSize,
        targetWin: targetWinPercentage ? parseFloat(targetWinPercentage) / 100 : undefined,
      });

      setResult(recommendation);
      toast.success('Battle calculated successfully!');
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to calculate battle');
    } finally {
      setIsCalculating(false);
    }
  }, [
    validateForm,
    useManualEntry,
    scoutPaste,
    enemyStatBonuses,
    enemyTotal,
    enemyInfPct,
    enemyCavPct,
    myScoutPaste,
    specialBonuses,
    myTier,
    myTG,
    enemyTier,
    enemyTG,
    battleTypeId,
    marchSize,
    targetWinPercentage,
  ]);

  // Auto-derive march size from My Troops scout when available
  const handleMyScoutPasteChange = useCallback((value: string) => {
    setMyScoutPaste(value);
    if (value.trim()) {
      const parsed = parseScoutPaste(value);
      if (parsed?.troops) {
        const total = parsed.troops.infantry + parsed.troops.cavalry + parsed.troops.archers;
        if (total > 0) {
          setMarchSize(total.toString());
        }
      }
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Enemy Troops Input */}
      <Card>
        <CardHeader>
          <CardTitle>Enemy Troops</CardTitle>
          <CardDescription>Enter enemy troop composition via scout paste or manual entry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="manual-entry"
              checked={useManualEntry}
              onCheckedChange={(checked) => setUseManualEntry(checked === true)}
            />
            <Label htmlFor="manual-entry">Use manual entry instead of scout paste</Label>
          </div>

          {!useManualEntry ? (
            <div className="space-y-4">
              <FormField label="Enemy Scout Paste" helpText={HELP_TEXT.scoutPaste} error={errors.scoutPaste}>
                <Textarea
                  placeholder="Paste enemy scout report here..."
                  value={scoutPaste}
                  onChange={(e) => setScoutPaste(e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                />
              </FormField>
              <div>
                <Label htmlFor="enemy-image-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {isOcrProcessingEnemy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Reading image...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Or upload enemy scout image
                      </>
                    )}
                  </div>
                </Label>
                <input
                  id="enemy-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleEnemyImageUpload}
                  className="hidden"
                  disabled={isOcrProcessingEnemy}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FormField label="Total Enemy Troops" error={errors.enemyTotal}>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g., 500,000"
                  value={enemyTotal}
                  onChange={(e) => setEnemyTotal(e.target.value)}
                />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Infantry %" error={errors.enemyComposition}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="50"
                    value={enemyInfPct}
                    onChange={(e) => setEnemyInfPct(e.target.value)}
                  />
                </FormField>
                <FormField label="Cavalry %" error={errors.enemyComposition}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="20"
                    value={enemyCavPct}
                    onChange={(e) => setEnemyCavPct(e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Enemy Stat Bonuses" error={errors.enemyStatBonuses} helpText={HELP_TEXT.scoutPaste}>
                <Textarea
                  placeholder="Paste stat bonuses (Infantry Attack: +150%, etc.)"
                  value={enemyStatBonuses}
                  onChange={(e) => setEnemyStatBonuses(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
              </FormField>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Troops (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>My Troops (Optional)</CardTitle>
          <CardDescription>Paste your scout to auto-fill march size and stat bonuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="My Scout Paste" helpText={HELP_TEXT.scoutPaste}>
            <Textarea
              placeholder="Paste your scout report here..."
              value={myScoutPaste}
              onChange={(e) => handleMyScoutPasteChange(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
          </FormField>
          <div>
            <Label htmlFor="my-image-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isOcrProcessingMy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reading image...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Or upload scout image
                  </>
                )}
              </div>
            </Label>
            <input
              id="my-image-upload"
              type="file"
              accept="image/*"
              onChange={handleMyImageUpload}
              className="hidden"
              disabled={isOcrProcessingMy}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tier and TG Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Tier & TG Configuration</CardTitle>
          <CardDescription>Set tier and training ground levels for both sides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">My Stats</h3>
              <FormField label="My Tier" helpText={HELP_TEXT.tierSelection} error={errors.myTier}>
                <Select value={myTier} onValueChange={setMyTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((t) => (
                      <SelectItem key={t} value={t.toString()}>
                        Tier {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="My TG Level" helpText={HELP_TEXT.tierSelection} error={errors.myTG}>
                <Select value={myTG} onValueChange={setMyTG}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => i + 1).map((tg) => (
                      <SelectItem key={tg} value={tg.toString()}>
                        TG {tg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Enemy Stats</h3>
              <FormField label="Enemy Tier" helpText={HELP_TEXT.tierSelection} error={errors.enemyTier}>
                <Select value={enemyTier} onValueChange={setEnemyTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((t) => (
                      <SelectItem key={t} value={t.toString()}>
                        Tier {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Enemy TG Level" helpText={HELP_TEXT.tierSelection} error={errors.enemyTG}>
                <Select value={enemyTG} onValueChange={setEnemyTG}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => i + 1).map((tg) => (
                      <SelectItem key={tg} value={tg.toString()}>
                        TG {tg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battle Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Battle Configuration</CardTitle>
          <CardDescription>Configure battle type and march parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Battle Type" helpText={HELP_TEXT.battleTypes}>
            <Select value={battleTypeId} onValueChange={setBattleTypeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BATTLE_TYPES.map((bt) => (
                  <SelectItem key={bt.id} value={bt.id.toString()}>
                    {bt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="March Size" helpText={HELP_TEXT.marchSize} error={errors.marchSize}>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="e.g., 500,000"
              value={marchSize}
              onChange={(e) => setMarchSize(e.target.value)}
            />
          </FormField>
          <FormField label="Target Win % (Optional)" helpText={HELP_TEXT.targetWin} error={errors.targetWinPercentage}>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="e.g., 80"
              value={targetWinPercentage}
              onChange={(e) => setTargetWinPercentage(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Special Bonuses (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Special Bonuses (Optional)</CardTitle>
          <CardDescription>Add special bonuses for both sides</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField label="Special Bonuses" helpText={HELP_TEXT.specialBonuses}>
            <Textarea
              placeholder="Enter special bonuses in two-column format..."
              value={specialBonuses}
              onChange={(e) => setSpecialBonuses(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Calculate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleCalculate}
          disabled={isCalculating}
          className="min-w-[200px]"
        >
          {isCalculating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-5 w-5" />
              Calculate Battle
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && <BattleResults result={result} />}

      {/* Debug Info (Optional) */}
      {debugInfo && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">OCR Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
