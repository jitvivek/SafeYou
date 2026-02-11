import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Check, Star, Crown, ArrowRight, Shield } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    api.getPlans().then(data => setPlans(data.plans)).catch(console.error);
  }, []);

  async function handleUpgrade(planId) {
    if (!user) {
      navigate('/register');
      return;
    }

    setUpgrading(true);
    try {
      // Simulate payment (for MVP, we just update the plan directly)
      await api.updatePlan(planId);
      await refreshUser();
      toast({
        title: 'Plan upgraded!',
        description: `You're now on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan.`,
      });
      navigate('/dashboard');
    } catch (err) {
      toast({ title: 'Upgrade failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpgrading(false);
    }
  }

  const planMeta = {
    trial: { popular: false, cta: 'Current Plan', icon: Shield },
    pro: { popular: true, cta: 'Upgrade to Pro', icon: Star },
    enterprise: { popular: false, cta: 'Get Enterprise', icon: Crown },
  };

  return (
    <div className="min-h-screen bg-background grid-pattern">
      <Navbar />

      <section className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Choose Your Security Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with a free trial. Upgrade anytime for full vulnerability reports, AI remediation, and more.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => {
              const meta = planMeta[plan.id] || {};
              const isCurrentPlan = user?.plan === plan.id;
              const Icon = meta.icon || Shield;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className={`relative h-full flex flex-col ${meta.popular ? 'border-primary glow-green' : ''}`}>
                    {meta.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="px-3">
                          <Star className="h-3 w-3 mr-1" /> Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="mt-4 mb-2">
                        <span className="text-4xl font-bold">
                          {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        </span>
                        {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                      </div>
                      <CardDescription>
                        {plan.scan_limit === -1 ? 'Unlimited scans' : `${plan.scan_limit} scans${plan.id === 'trial' ? ' total' : '/month'}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        {plan.features?.map((feature, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isCurrentPlan ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          variant={meta.popular ? 'glow' : 'outline'}
                          className="w-full"
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={upgrading}
                        >
                          {upgrading ? 'Processing...' : meta.cta || 'Select Plan'}
                          {!upgrading && <ArrowRight className="ml-1 h-4 w-4" />}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ */}
          <motion.div
            className="max-w-2xl mx-auto mt-20 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            {[
              {
                q: 'What happens when my trial ends?',
                a: 'After your 3 free scans, you can still view your existing reports. To run new scans and access full reports, upgrade to Pro or Enterprise.',
              },
              {
                q: 'Can I downgrade my plan?',
                a: 'Yes, you can change your plan at any time. Your data is always preserved.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.',
              },
              {
                q: 'Is there a money-back guarantee?',
                a: 'Yes, we offer a 30-day money-back guarantee on all paid plans.',
              },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium mb-1">{item.q}</p>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
