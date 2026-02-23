import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { formatNumber } from '@/utils/formatters';
import { Shield, Swords, Target } from 'lucide-react';
import type { RecommendResult } from '@/lib/kingshotCore';

interface BattleResultsProps {
  result: RecommendResult;
}

export function BattleResults({ result }: BattleResultsProps) {
  const winColor = result.winPct >= 0.5 ? 'text-tactical-success' : 'text-tactical-danger';
  const winBgColor = result.winPct >= 0.5 ? 'bg-tactical-success/10' : 'bg-tactical-danger/10';
  const winPctDisplay = (result.winPct * 100);
  const expectedToWin = result.winPct >= 0.5;
  
  // Calculate total march used
  const marchUsed = result.troops.infantry + result.troops.cavalry + result.troops.archers;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Win Probability */}
      <Card className="border-tactical-steel/30 bg-tactical-dark-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-tactical-amber">
            <Target className="h-5 w-5" />
            Battle Outcome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Win Probability</p>
              <p className={`text-5xl font-bold tabular-nums ${winColor}`}>
                {winPctDisplay.toFixed(1)}%
              </p>
            </div>
            <Badge 
              variant={expectedToWin ? "default" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {expectedToWin ? "Expected Win" : "Expected Loss"}
            </Badge>
          </div>
          <Progress value={winPctDisplay} className="h-3" />
        </CardContent>
      </Card>

      {/* Best Formation */}
      <Card className="border-tactical-steel/30 bg-tactical-dark-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-tactical-olive">
            <Swords className="h-5 w-5" />
            Recommended Formation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className={`${winBgColor} rounded-lg p-4 text-center`}>
              <p className="text-sm text-muted-foreground mb-1">Infantry</p>
              <p className="text-3xl font-bold tabular-nums">{result.formation.infantry}%</p>
              <p className="text-xs text-muted-foreground mt-2">{formatNumber(result.troops.infantry)}</p>
            </div>
            <div className={`${winBgColor} rounded-lg p-4 text-center`}>
              <p className="text-sm text-muted-foreground mb-1">Cavalry</p>
              <p className="text-3xl font-bold tabular-nums">{result.formation.cavalry}%</p>
              <p className="text-xs text-muted-foreground mt-2">{formatNumber(result.troops.cavalry)}</p>
            </div>
            <div className={`${winBgColor} rounded-lg p-4 text-center`}>
              <p className="text-sm text-muted-foreground mb-1">Archers</p>
              <p className="text-3xl font-bold tabular-nums">{result.formation.archers}%</p>
              <p className="text-xs text-muted-foreground mt-2">{formatNumber(result.troops.archers)}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Total March Size</p>
            <p className="text-2xl font-bold tabular-nums text-tactical-steel">
              {formatNumber(marchUsed)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Required March Size */}
      {result.requiredMarchSize !== null && (
        <Card className="border-tactical-steel/30 bg-tactical-dark-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-tactical-steel">
              <Shield className="h-5 w-5" />
              Required March Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Minimum march to achieve target win rate</p>
                <p className="text-3xl font-bold tabular-nums text-tactical-success">
                  {formatNumber(result.requiredMarchSize)}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Infantry</p>
                  <p className="font-semibold tabular-nums">
                    {formatNumber(Math.round(result.requiredMarchSize * (result.formation.infantry / 100)))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cavalry</p>
                  <p className="font-semibold tabular-nums">
                    {formatNumber(Math.round(result.requiredMarchSize * (result.formation.cavalry / 100)))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Archers</p>
                  <p className="font-semibold tabular-nums">
                    {formatNumber(Math.round(result.requiredMarchSize * (result.formation.archers / 100)))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
