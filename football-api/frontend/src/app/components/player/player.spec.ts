import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { PlayerComponent } from './player';
import { PlayerService } from '../../services/player/player';

// Verifica que el catálogo pueda crearse y solicite la página inicial.
describe('Player', () => {
  let component: PlayerComponent;
  let fixture: ComponentFixture<PlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        provideRouter([]),
        {
          provide: PlayerService,
          useValue: {
            list: () =>
              of({
                data: [],
                pagination: { page: 1, limit: 10, total: 0, pages: 0 },
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the initial page', () => {
    expect(component).toBeTruthy();
    expect(component.players).toEqual([]);
    expect(component.page).toBe(1);
  });
});
