import React from 'react';
import { Section, Image } from '@telegram-apps/telegram-ui';
import { useBalance } from '@/context/balanceContext';
import { NavigationBar } from '@/components/NavigationBar/NavigationBar';
import { QuestsComponent } from '@/components/QuestComponent/QuestComponent';

import ball1 from '../../../assets/ball1.png';

export const IndexPage: React.FC = () => {
  const { balance } = useBalance();

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '10px',
        background: '#f0f0f0'
      }}>
        <Image src={ball1} alt="BallCry" style={{ width: '50px', height: '50px' }} />
        <div>Balance: { balance } BallCry</div>
      </div>

      <Section>
        <QuestsComponent />
      </Section>

      <NavigationBar />
    </div>
  );
};