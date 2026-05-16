class TradingAnalyzer {
    constructor() {
        this.selectedTimeframe = '15m';
        this.symbol = 'BTCUSDT';
        this.settings = {
            rsiThreshold: 70,
            scoreThreshold: 5,
            volumeThreshold: 100,
            enableMACD: true,
            enableRSI: true,
            enableVolume: true
        };
        this.loadSettings();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedTimeframe = e.target.dataset.timeframe;
            });
        });

        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyze();
        });

        document.getElementById('symbol').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyze();
            }
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
        });

        document.getElementById('rsiThreshold').addEventListener('change', (e) => {
            this.settings.rsiThreshold = parseInt(e.target.value);
            document.getElementById('rsiThresholdValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('scoreThreshold').addEventListener('change', (e) => {
            this.settings.scoreThreshold = parseInt(e.target.value);
            document.getElementById('scoreThresholdValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('volumeThreshold').addEventListener('change', (e) => {
            this.settings.volumeThreshold = parseInt(e.target.value);
            document.getElementById('volumeThresholdValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('enableMACD').addEventListener('change', (e) => {
            this.settings.enableMACD = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('enableRSI').addEventListener('change', (e) => {
            this.settings.enableRSI = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('enableVolume').addEventListener('change', (e) => {
            this.settings.enableVolume = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                document.getElementById('settingsModal').classList.remove('active');
            }
        });
    }

    loadSettings() {
        const saved = localStorage.getItem('tradingSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
            document.getElementById('rsiThreshold').value = this.settings.rsiThreshold;
            document.getElementById('rsiThresholdValue').textContent = this.settings.rsiThreshold;
            document.getElementById('scoreThreshold').value = this.settings.scoreThreshold;
            document.getElementById('scoreThresholdValue').textContent = this.settings.scoreThreshold;
            document.getElementById('volumeThreshold').value = this.settings.volumeThreshold;
            document.getElementById('volumeThresholdValue').textContent = this.settings.volumeThreshold;
            document.getElementById('enableMACD').checked = this.settings.enableMACD;
            document.getElementById('enableRSI').checked = this.settings.enableRSI;
            document.getElementById('enableVolume').checked = this.settings.enableVolume;
        }
    }

    saveSettings() {
        localStorage.setItem('tradingSettings', JSON.stringify(this.settings));
    }

    async analyze() {
        this.symbol = document.getElementById('symbol').value.toUpperCase();

        if (!this.symbol) {
            this.showError('لطفاً نماد رمزارز را وارد کنید');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const data = await this.fetchCandleData();
            const analysis = this.analyzeData(data);
            this.displayResults(analysis);
        } catch (error) {
            console.error('Error:', error);
            this.showError('خطا در دریافت داده‌ها. لطفاً نماد را بررسی کنید و دوباره تلاش کنید.');
            this.showLoading(false);
        }
    }

    async fetchCandleData() {
        const interval = this.getInterval();
        const url = `https://api.binance.com/api/v3/klines?symbol=${this.symbol}&interval=${interval}&limit=200`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('نماد معتبر نیست');
        }

        const data = await response.json();
        return this.processCandles(data);
    }

    getInterval() {
        const intervals = {
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d'
        };
        return intervals[this.selectedTimeframe];
    }

    processCandles(rawData) {
        return rawData.map(candle => ({
            time: new Date(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[7])
        }));
    }

    analyzeData(candles) {
        const analysis = {
            currentPrice: candles[candles.length - 1].close,
            ema20: this.calculateEMA(candles, 20),
            ema50: this.calculateEMA(candles, 50),
            ema200: this.calculateEMA(candles, 200),
            rsi: this.calculateRSI(candles),
            macd: this.calculateMACD(candles),
            volume: this.analyzeVolume(candles),
            support: this.calculateSupport(candles),
            resistance: this.calculateResistance(candles),
            priceChange24h: ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100
        };

        analysis.trend = this.determineTrend(analysis);
        analysis.score = this.calculateScore(analysis);
        analysis.decision = this.makeDecision(analysis);
        analysis.alerts = this.generateAlerts(analysis);

        return analysis;
    }

    calculateEMA(candles, period) {
        const closes = candles.map(c => c.close);
        let ema = closes[0];
        const multiplier = 2 / (period + 1);

        for (let i = 1; i < closes.length; i++) {
            ema = closes[i] * multiplier + ema * (1 - multiplier);
        }

        return ema;
    }

    calculateRSI(candles, period = 14) {
        const closes = candles.map(c => c.close);
        const deltas = [];

        for (let i = 1; i < closes.length; i++) {
            deltas.push(closes[i] - closes[i - 1]);
        }

        let gains = 0, losses = 0;

        for (let i = 0; i < period; i++) {
            if (deltas[i] > 0) gains += deltas[i];
            else losses -= deltas[i];
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period; i < deltas.length; i++) {
            if (deltas[i] > 0) gains = deltas[i];
            else gains = 0;

            if (deltas[i] < 0) losses = -deltas[i];
            else losses = 0;

            avgGain = (avgGain * (period - 1) + gains) / period;
            avgLoss = (avgLoss * (period - 1) + losses) / period;
        }

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return isNaN(rsi) ? 50 : rsi;
    }

    calculateMACD(candles) {
        const ema12 = this.calculateEMA(candles, 12);
        const ema26 = this.calculateEMA(candles, 26);
        const macdLine = ema12 - ema26;

        const closes = candles.map(c => c.close);
        const macdValues = [];

        for (let i = 0; i < closes.length; i++) {
            const e12 = this.calculateEMAUpTo(closes.slice(0, i + 1), 12);
            const e26 = this.calculateEMAUpTo(closes.slice(0, i + 1), 26);
            macdValues.push(e12 - e26);
        }

        const signal = this.calculateEMA(
            macdValues.map((v, i) => ({ close: v })),
            9
        );

        const histogram = macdLine - signal;

        return {
            macd: macdLine,
            signal: signal,
            histogram: histogram,
            trend: macdLine > signal ? 'صعودی' : 'نزولی'
        };
    }

    calculateEMAUpTo(values, period) {
        if (values.length < 2) return values[0];
        let ema = values[0];
        const multiplier = 2 / (period + 1);

        for (let i = 1; i < values.length; i++) {
            ema = values[i] * multiplier + ema * (1 - multiplier);
        }

        return ema;
    }

    analyzeVolume(candles) {
        const volumes = candles.map(c => c.volume);
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b) / 20;

        return {
            current: currentVolume,
            average: avgVolume,
            ratio: (currentVolume / avgVolume) * 100,
            status: currentVolume > avgVolume ? 'قوی' : currentVolume < avgVolume * 0.8 ? 'ضعیف' : 'نرمال'
        };
    }

    calculateSupport(candles) {
        const lows = candles.slice(-50).map(c => c.low);
        return Math.min(...lows);
    }

    calculateResistance(candles) {
        const highs = candles.slice(-50).map(c => c.high);
        return Math.max(...highs);
    }

    determineTrend(analysis) {
        const { currentPrice, ema50, ema200 } = analysis;

        if (currentPrice > ema50 && currentPrice > ema200) {
            return 'صعودی';
        } else if (currentPrice < ema50 && currentPrice < ema200) {
            return 'نزولی';
        } else {
            return 'خنثی';
        }
    }

    calculateScore(analysis) {
        let score = 0;

        if (analysis.trend === 'صعودی') score += 2;
        if (analysis.trend === 'نزولی') score -= 2;

        const priceToResistance = ((analysis.resistance - analysis.currentPrice) / analysis.resistance) * 100;
        const priceToSupport = ((analysis.currentPrice - analysis.support) / analysis.support) * 100;

        if (priceToSupport < 5) score += 2;
        if (priceToResistance < 5) score -= 2;

        if (this.settings.enableRSI) {
            if (analysis.rsi > 40 && analysis.rsi < 60) score += 1;
            if (analysis.rsi > this.settings.rsiThreshold) score -= 2;
            if (analysis.rsi < 30) score += 1;
        }

        if (this.settings.enableMACD) {
            if (analysis.macd.trend === 'صعودی') score += 2;
            if (analysis.macd.trend === 'نزولی') score -= 2;
        }

        if (this.settings.enableVolume) {
            if (analysis.volume.status === 'قوی') score += 2;
            if (analysis.volume.status === 'ضعیف') score -= 1;
        }

        return Math.max(0, Math.min(10, score));
    }

    makeDecision(analysis) {
        if (analysis.score >= this.settings.scoreThreshold) {
            return {
                type: 'positive',
                title: '✅ ورود مناسب است',
                description: 'شرایط بازار برای ورود به معامله مناسب به نظر می‌رسد.',
                icon: '✅'
            };
        } else if (analysis.score >= this.settings.scoreThreshold - 2) {
            return {
                type: 'warning',
                title: '⚠️ شرایط متوسط است',
                description: 'شرایط می‌تواند مناسب باشد، اما با احتیاط تصمیم بگیرید.',
                icon: '⚠️'
            };
        } else {
            return {
                type: 'negative',
                title: '❌ ورود مناسب نیست',
                description: 'شرایط فعلی برای ورود به معامله مناسب نیست. صبور باشید.',
                icon: '❌'
            };
        }
    }

    generateAlerts(analysis) {
        const alerts = [];

        if (analysis.rsi > this.settings.rsiThreshold) {
            alerts.push({
                type: 'danger',
                message: `⚠️ اشباع خرید: RSI در ${analysis.rsi.toFixed(1)} است`
            });
        }

        if (analysis.rsi < 30) {
            alerts.push({
                type: 'success',
                message: `💡 اشباع فروش: RSI در ${analysis.rsi.toFixed(1)} است`
            });
        }

        const priceToResistance = ((analysis.resistance - analysis.currentPrice) / analysis.resistance) * 100;
        if (priceToResistance < 5) {
            alerts.push({
                type: 'warning',
                message: `📍 قیمت نزدیک مقاومت است (${priceToResistance.toFixed(1)}%)`
            });
        }

        const priceToSupport = ((analysis.currentPrice - analysis.support) / analysis.support) * 100;
        if (priceToSupport < 5) {
            alerts.push({
                type: 'success',
                message: `📍 قیمت نزدیک حمایت است (${priceToSupport.toFixed(1)}%)`
            });
        }

        if (analysis.volume.status === 'ضعیف') {
            alerts.push({
                type: 'warning',
                message: `📊 حجم ضعیف است (${analysis.volume.ratio.toFixed(0)}% از میانگین)`
            });
        }

        if (analysis.volume.ratio > 150) {
            alerts.push({
                type: 'success',
                message: `📊 حجم بسیار قوی است (${analysis.volume.ratio.toFixed(0)}% از میانگین)`
            });
        }

        if (analysis.macd.histogram > 0 && analysis.macd.trend === 'صعودی') {
            alerts.push({
                type: 'success',
                message: '📈 MACD کراس صعودی'
            });
        }

        if (analysis.macd.histogram < 0 && analysis.macd.trend === 'نزولی') {
            alerts.push({
                type: 'danger',
                message: '📉 MACD کراس نزولی'
            });
        }

        if (analysis.priceChange24h > 5) {
            alerts.push({
                type: 'success',
                message: `🚀 رشد قوی در 24 ساعت (+${analysis.priceChange24h.toFixed(2)}%)`
            });
        }

        if (analysis.priceChange24h < -5) {
            alerts.push({
                type: 'danger',
                message: `📉 ریزش قوی در 24 ساعت (${analysis.priceChange24h.toFixed(2)}%)`
            });
        }

        return alerts.length > 0 ? alerts : [
            {
                type: 'warning',
                message: '📝 شرایط معمولی - هیچ هشدار خاصی وجود ندارد'
            }
        ];
    }

    displayResults(analysis) {
        this.showLoading(false);
        document.getElementById('resultsSection').classList.add('active');

        const decisionCard = document.getElementById('decisionCard');
        decisionCard.className = `decision-card ${analysis.decision.type}`;
        document.getElementById('decisionIcon').textContent = analysis.decision.icon;
        document.getElementById('decisionText').textContent = analysis.decision.title;
        document.getElementById('decisionDescription').textContent = analysis.decision.description;

        const scoreValue = Math.round(analysis.score);
        document.getElementById('scoreValue').textContent = scoreValue;
        const scorePercentage = (analysis.score / 10) * 100;
        document.getElementById('scoreBarFill').style.width = scorePercentage + '%';
        document.getElementById('scoreBarFill').textContent = scoreValue;

        const priceInfo = document.getElementById('priceInfo');
        priceInfo.innerHTML = `
            <div class="price-box">
                <div class="price-label">قیمت فعلی</div>
                <div class="price-value">${analysis.currentPrice.toFixed(2)}</div>
            </div>
            <div class="price-box">
                <div class="price-label">حمایت</div>
                <div class="price-value">${analysis.support.toFixed(2)}</div>
            </div>
            <div class="price-box">
                <div class="price-label">مقاومت</div>
                <div class="price-value">${analysis.resistance.toFixed(2)}</div>
            </div>
            <div class="price-box">
                <div class="price-label">تغییر 24 ساعت</div>
                <div class="price-value ${analysis.priceChange24h > 0 ? 'positive' : 'negative'}">
                    ${analysis.priceChange24h > 0 ? '+' : ''}${analysis.priceChange24h.toFixed(2)}%
                </div>
            </div>
        `;

        document.getElementById('trendStatus').textContent = analysis.trend;
        document.getElementById('trendStatus').className = 'info-value';
        if (analysis.trend === 'صعودی') document.getElementById('trendStatus').classList.add('positive');
        if (analysis.trend === 'نزولی') document.getElementById('trendStatus').classList.add('negative');

        document.getElementById('ema50Status').textContent = analysis.currentPrice > analysis.ema50 ? 'بالاتر از EMA50' : 'پایین‌تر از EMA50';
        document.getElementById('ema50Status').className = 'info-value';
        if (analysis.currentPrice > analysis.ema50) document.getElementById('ema50Status').classList.add('positive');
        else document.getElementById('ema50Status').classList.add('negative');

        document.getElementById('ema200Status').textContent = analysis.currentPrice > analysis.ema200 ? 'بالاتر از EMA200' : 'پایین‌تر از EMA200';
        document.getElementById('ema200Status').className = 'info-value';
        if (analysis.currentPrice > analysis.ema200) document.getElementById('ema200Status').classList.add('positive');
        else document.getElementById('ema200Status').classList.add('negative');

        document.getElementById('rsiValue').textContent = analysis.rsi.toFixed(1);
        document.getElementById('rsiValue').className = 'info-value';

        if (analysis.rsi > this.settings.rsiThreshold) {
            document.getElementById('rsiValue').classList.add('negative');
            document.getElementById('rsiStatus').textContent = 'اشباع خرید';
            document.getElementById('rsiStatus').className = 'info-value negative';
        } else if (analysis.rsi < 30) {
            document.getElementById('rsiValue').classList.add('positive');
            document.getElementById('rsiStatus').textContent = 'اشباع فروش';
            document.getElementById('rsiStatus').className = 'info-value positive';
        } else {
            document.getElementById('rsiValue').classList.add('warning');
            document.getElementById('rsiStatus').textContent = 'متوازن';
            document.getElementById('rsiStatus').className = 'info-value warning';
        }

        document.getElementById('macdStatus').textContent = analysis.macd.trend;
        document.getElementById('macdStatus').className = 'info-value';
        if (analysis.macd.trend === 'صعودی') document.getElementById('macdStatus').classList.add('positive');
        if (analysis.macd.trend === 'نزولی') document.getElementById('macdStatus').classList.add('negative');

        document.getElementById('supportLevel').textContent = analysis.support.toFixed(2);
        document.getElementById('resistanceLevel').textContent = analysis.resistance.toFixed(2);

        const pricePosition = ((analysis.currentPrice - analysis.support) / (analysis.resistance - analysis.support)) * 100;
        let positionText = '';
        if (pricePosition < 20) positionText = 'نزدیک حمایت';
        else if (pricePosition > 80) positionText = 'نزدیک مقاومت';
        else positionText = 'وسط راه';

        document.getElementById('pricePosition').textContent = positionText;
        document.getElementById('pricePosition').className = 'info-value';
        if (pricePosition < 20) document.getElementById('pricePosition').classList.add('positive');
        if (pricePosition > 80) document.getElementById('pricePosition').classList.add('negative');

        document.getElementById('currentVolume').textContent = analysis.volume.current.toFixed(0);
        document.getElementById('avgVolume').textContent = analysis.volume.average.toFixed(0);
        document.getElementById('volumeStatus').textContent = analysis.volume.status;
        document.getElementById('volumeStatus').className = 'info-value';
        if (analysis.volume.status === 'قوی') document.getElementById('volumeStatus').classList.add('positive');
        if (analysis.volume.status === 'ضعیف') document.getElementById('volumeStatus').classList.add('negative');

        document.getElementById('ema20Value').textContent = analysis.ema20.toFixed(2);
        document.getElementById('ema50Value').textContent = analysis.ema50.toFixed(2);
        document.getElementById('ema200Value').textContent = analysis.ema200.toFixed(2);

        document.getElementById('macdSignal').textContent = analysis.macd.signal.toFixed(6);
        document.getElementById('macdHistogram').textContent = analysis.macd.histogram.toFixed(6);
        document.getElementById('macdHistogram').className = 'info-value';
        if (analysis.macd.histogram > 0) document.getElementById('macdHistogram').classList.add('positive');
        if (analysis.macd.histogram < 0) document.getElementById('macdHistogram').classList.add('negative');

        document.getElementById('priceChange').textContent = `${analysis.priceChange24h > 0 ? '+' : ''}${analysis.priceChange24h.toFixed(2)}%`;
        document.getElementById('priceChange').className = 'info-value';
        if (analysis.priceChange24h > 0) document.getElementById('priceChange').classList.add('positive');
        if (analysis.priceChange24h < 0) document.getElementById('priceChange').classList.add('negative');

        const alertsList = document.getElementById('alertsList');
        alertsList.innerHTML = analysis.alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span>${alert.message}</span>
            </div>
        `).join('');

        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('active', show);
        document.getElementById('analyzeBtn').disabled = show;
    }

    showError(message) {
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.textContent = message;
        errorMsg.classList.add('active');
    }

    hideError() {
        document.getElementById('errorMessage').classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TradingAnalyzer();
});